import { useState, useMemo, useEffect, useRef } from 'react';
import { SERVICES, isDayAllowed, WHATSAPP_NUMBER, generateWhatsAppUrl, formatPhone, getBookingDuration, ScheduleBlock } from '@/lib/types';
import { addBooking, getBookings, getBlocks } from '@/lib/bookingStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, X, Plus, Sparkles, Copy, Check, Upload, FileImage } from 'lucide-react';

const PIX_KEY = '9a3b3e57-f517-4eaf-a857-b1e60abb16df';
const SINAL_VALUE = 30;

type ServiceType = typeof SERVICES[0];

const BookingSection = () => {
  const [step, setStep] = useState(1);
  const [activeCategory, setActiveCategory] = useState('Cílios - Aplicação');
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [selectedOption, setSelectedOption] = useState<{ label: string; price: number; time: number } | null>(null);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [pendingService, setPendingService] = useState<ServiceType | null>(null);
  const [extras, setExtras] = useState<ServiceType[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pix Signal Modal states
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [comprovanteUploading, setComprovanteUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingBookingRef = useRef<any>(null);

  const totalDuration = useMemo(() => {
    if (!selectedService) return 0;
    const baseTime = selectedOption ? selectedOption.time : selectedService.time;
    return baseTime + extras.reduce((sum, e) => sum + e.time, 0);
  }, [selectedService, selectedOption, extras]);

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [googleBookings, setGoogleBookings] = useState<Booking[]>([]);
  const [googleBlocks, setGoogleBlocks] = useState<ScheduleBlock[]>([]);
  const [weekdaySlots, setWeekdaySlots] = useState<{ weekday: number; time: string }[]>([]);
  const [dateSlots, setDateSlots] = useState<{ selected_date: string; time: string }[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

  // Load schedule events directly from the API on selectedDate change to act as real-time source of truth
  useEffect(() => {
    if (!selectedDate) {
      setAvailableTimes([]);
      return;
    }

    setLoadingTimes(true);
    fetch('/api/calendar?realtime=true')
      .then((res) => {
        if (!res.ok) throw new Error('Erro ao carregar os dados da agenda.');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data.bookings)) {
          setGoogleBookings(data.bookings);
        }
        if (Array.isArray(data.blocks)) {
          setGoogleBlocks(data.blocks);
        }
        if (Array.isArray(data.weekdaySlots)) {
          setWeekdaySlots(data.weekdaySlots);
        }
        if (Array.isArray(data.dateSpecificSlots)) {
          setDateSlots(data.dateSpecificSlots);
        }
      })
      .catch((err) => {
        console.error("Error loading events from Google Calendar API:", err);
      })
      .finally(() => {
        setLoadingTimes(false);
      });
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate || !selectedService) {
      setAvailableTimes([]);
      return;
    }

    const dateStr = format(selectedDate, 'dd/MM/yyyy');
    const dateIsoStr = format(selectedDate, 'yyyy-MM-dd');
    
    // 1. Check Date Specific Whitelist (ex: Calendar Exceptions)
    const dateSpecific = dateSlots
      .filter((s) => s.selected_date === dateIsoStr)
      .map((s) => s.time)
      .sort((a, b) => {
        const [ha, ma] = a.split(':').map(Number);
        const [hb, mb] = b.split(':').map(Number);
        return (ha * 60 + ma) - (hb * 60 + mb);
      });

    // 2. Check Weekday Whitelist if no date specific slots
    const dayOfWeek = selectedDate.getDay();
    const weekdaySpecific = weekdaySlots
      .filter((s) => s.weekday === dayOfWeek)
      .map((s) => s.time)
      .sort((a, b) => {
        const [ha, ma] = a.split(':').map(Number);
        const [hb, mb] = b.split(':').map(Number);
        return (ha * 60 + ma) - (hb * 60 + mb);
      });

    const baseTimes = dateSpecific.length > 0 
      ? dateSpecific 
      : weekdaySpecific;

    const calculateLocalSlots = () => {
      // Mescla reservas locais e do Google Calendar para evitar duplicados e manter consistência imediata
      const localBookings = getBookings().filter((b) => b.date === dateStr && b.status !== 'completed');
      const apiBookings = googleBookings.filter((b) => b.date === dateStr && b.status !== 'completed');
      const bookings = [...apiBookings];
      localBookings.forEach(lb => {
        const lbIdNormalized = lb.id.replace(/-/g, '').toLowerCase();
        if (!bookings.some(ab => ab.id === lb.id || ab.id.replace(/-/g, '').toLowerCase() === lbIdNormalized)) {
          bookings.push(lb);
        }
      });

      const localBlocks = getBlocks().filter((block) => block.date === dateStr);
      const apiBlocks = googleBlocks.filter((block) => block.date === dateStr);
      const blocks = [...apiBlocks];
      localBlocks.forEach(lb => {
        const lbIdNormalized = lb.id.replace(/-/g, '').toLowerCase();
        if (!blocks.some(ab => ab.id === lb.id || ab.id.replace(/-/g, '').toLowerCase() === lbIdNormalized)) {
          blocks.push(lb);
        }
      });

      const timeToMinutes = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      const now = new Date();
      const isToday = selectedDate.toDateString() === now.toDateString();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      return baseTimes.filter((timeStr) => {
        const start = timeToMinutes(timeStr);
        const end = start + totalDuration;

        // Filter out past times for today
        if (isToday && start < currentMinutes) {
          return false;
        }

        // Check overlap with schedule blocks of the day
        const hasBlockOverlap = blocks.some((block) => {
          if (block.allDay) return true;
          if (!block.start || !block.end) return false;
          
          const blockStart = timeToMinutes(block.start);
          const blockEnd = timeToMinutes(block.end);
          
          return Math.max(start, blockStart) < Math.min(end, blockEnd);
        });

        if (hasBlockOverlap) {
          return false;
        }

        // Check overlap with any booking of the day
        const hasOverlap = bookings.some((b) => {
          const bStart = timeToMinutes(b.time);
          const bDuration = getBookingDuration(b.service);
          const bEnd = bStart + bDuration;

          return Math.max(start, bStart) < Math.min(end, bEnd);
        });

        return !hasOverlap;
      });
    };

    const localSlots = calculateLocalSlots();
    setAvailableTimes(localSlots);
  }, [selectedDate, selectedService, extras, totalDuration, googleBookings, googleBlocks, weekdaySlots, dateSlots]);

  // Combined service name and price
  const combinedServiceName = useMemo(() => {
    if (!selectedService) return '';
    const baseName = selectedOption 
      ? `${selectedService.name} - ${selectedOption.label}` 
      : selectedService.name;
    const names = [baseName, ...extras.map(e => e.name)];
    return names.join(' + ');
  }, [selectedService, selectedOption, extras]);

  const totalPrice = useMemo(() => {
    if (!selectedService) return 0;
    const basePrice = selectedOption ? selectedOption.price : selectedService.price;
    return basePrice + extras.reduce((sum, e) => sum + e.price, 0);
  }, [selectedService, selectedOption, extras]);

  // Order bump: suggest related beauty add-ons
  const availableExtras = useMemo(() => {
    if (!selectedService) return [];
    return SERVICES.filter(s => 
      s.name !== selectedService.name && 
      (s.name === 'Remoção de Extensão' || s.name === 'Design Personalizado' || s.name === 'Design com Henna' || s.name === 'Limpeza de Pele')
    );
  }, [selectedService]);

  const handleSelectService = (s: ServiceType) => {
    if (s.category === 'Cílios - Manutenção') {
      setPendingService(s);
      setShowOptionModal(true);
    } else {
      setSelectedService(s);
      setSelectedOption(null);
      setExtras([]);
      setStep(2);
    }
  };

  const handleToggleExtra = (s: ServiceType) => {
    setExtras(prev => {
      const exists = prev.find(e => e.name === s.name);
      if (exists) return prev.filter(e => e.name !== s.name);
      return [...prev, s];
    });
  };

  const handleSkipExtras = () => {
    setStep(2);
  };

  const handleConfirmExtras = () => {
    setStep(2);
  };

  const handleSelectDate = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setSelectedTime('');
      setStep(3);
    }
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setStep(4);
  };

  const handleConfirm = () => {
    if (!name.trim() || !phone.trim() || !selectedService || !selectedDate || !selectedTime) return;

    const dateStr = format(selectedDate, 'dd/MM/yyyy');
    const booking = {
      id: crypto.randomUUID(),
      service: combinedServiceName,
      price: totalPrice,
      date: dateStr,
      time: selectedTime,
      name: name.trim(),
      phone: phone.trim(),
      status: 'accepted' as const,
    };

    // Sinal obrigatório para todas as clientes
    pendingBookingRef.current = booking;
    setShowPixModal(true);
  };

  const finishBookingFlow = (booking: any, comprovanteUrl: string | null) => {
    setIsSubmitting(true);

    const bookingWithStatus = comprovanteUrl
      ? { ...booking, status: 'pendente_confirmacao' as const, comprovante_url: comprovanteUrl }
      : booking;

    const finishBooking = () => {
      addBooking(bookingWithStatus);

      let msg = `✨ *NOVO AGENDAMENTO - STUDIO BRENDA BATISTA* ✨\n\n👤 *Cliente:* ${bookingWithStatus.name}\n📱 *Telefone:* ${bookingWithStatus.phone}\n✂️ *Serviço:* ${bookingWithStatus.service}\n📅 *Data/Horário:* ${bookingWithStatus.date} às ${bookingWithStatus.time}\n💰 *Valor Total:* R$ ${bookingWithStatus.price},00`;

      if (comprovanteUrl) {
        msg += `\n💳 *Sinal Pago:* R$ ${SINAL_VALUE},00\n\n📎 *Comprovante do Sinal:*\n${comprovanteUrl}\n\n_Aguardando confirmação final do estúdio._`;
      } else {
        msg += `\n\nObrigado! 💕`;
      }

      window.location.href = generateWhatsAppUrl(WHATSAPP_NUMBER, msg);

      setIsSubmitting(false);
      setShowPixModal(false);
      setComprovanteFile(null);
      setShowSuccess(true);
      setStep(1);
      setSelectedService(null);
      setExtras([]);
      setSelectedDate(undefined);
      setSelectedTime('');
      setName('');
      setPhone('');
      pendingBookingRef.current = null;
    };

    fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'booking', booking: bookingWithStatus, duration: totalDuration }),
    })
      .then(async (res) => {
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw e; }
        return res.json();
      })
      .then(() => finishBooking())
      .catch((err) => {
        setIsSubmitting(false);
        if (err && err.error === 'slot_occupied') {
          alert(err.message || 'Este horário acabou de ser preenchido, por favor selecione outro.');
          setStep(3);
          setSelectedTime('');
          fetch('/api/calendar?realtime=true')
            .then((r) => r.json())
            .then((d) => {
              if (Array.isArray(d.bookings)) setGoogleBookings(d.bookings);
              if (Array.isArray(d.blocks)) setGoogleBlocks(d.blocks);
              if (Array.isArray(d.weekdaySlots)) setWeekdaySlots(d.weekdaySlots);
              if (Array.isArray(d.dateSpecificSlots)) setDateSlots(d.dateSpecificSlots);
            });
        } else {
          alert('Ocorreu um erro ao salvar o agendamento. Por favor, tente novamente.');
        }
      });
  };

  const handlePixCopy = () => {
    navigator.clipboard.writeText(PIX_KEY).then(() => {
      setPixCopiado(true);
      setTimeout(() => setPixCopiado(false), 2500);
    });
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      alert('Formato inválido. Use JPG, PNG ou PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 10MB.');
      return;
    }
    setComprovanteFile(file);
  };

  const handleSubmitWithComprovante = async () => {
    if (!comprovanteFile || !pendingBookingRef.current) return;
    setComprovanteUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const res = await fetch('/api/upload-comprovante', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: comprovanteFile.name,
            fileType: comprovanteFile.type,
            fileData: base64,
          }),
        });
        const data = await res.json();
        setComprovanteUploading(false);
        if (data.url) {
          finishBookingFlow(pendingBookingRef.current, data.url);
        } else {
          alert('Erro ao enviar comprovante. Tente novamente.');
        }
      };
      reader.readAsDataURL(comprovanteFile);
    } catch {
      setComprovanteUploading(false);
      alert('Erro ao processar o arquivo. Tente novamente.');
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <>
      <section id="agendar" className="pt-24 pb-12 px-4 md:px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">Agende seu horário</h2>
          <p className="text-muted-foreground mt-2">Escolha o serviço e o melhor momento para você.</p>
        </div>

        <div className="glass rounded-3xl p-4 md:p-8 card-shadow min-h-[400px]">
          {/* Steps */}
          <div className="flex justify-between mb-10 px-2 md:px-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors text-sm',
                    step >= i ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {i}
                </div>
                <span className="text-xs text-muted-foreground hidden md:block">
                  {['Serviço', 'Data', 'Horário', 'Dados'][i - 1]}
                </span>
              </div>
            ))}
          </div>

          {step > 1 && (
            <button onClick={goBack} className="mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Voltar
            </button>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                {/* Category Tabs */}
                <div className="flex justify-center gap-2 mb-8 flex-wrap">
                  {Array.from(new Set(SERVICES.map(s => s.category))).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300",
                        activeCategory === cat
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-2 px-2">
                  {SERVICES.filter(s => s.category === activeCategory).map((s) => (
                    <button
                      key={s.name}
                      onClick={() => handleSelectService(s)}
                      className="flex-shrink-0 w-[200px] md:w-[220px] h-[240px] md:h-[270px] rounded-2xl border border-border hover:border-primary/50 transition-all text-center group overflow-hidden snap-center relative"
                    >
                      <img
                        src={s.image}
                        alt={s.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        width={220}
                        height={270}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                        <h3 className="font-bold text-sm md:text-base text-white group-hover:text-primary transition-colors">{s.name}</h3>
                        <p className="text-xs text-white/70 mt-1">
                          {s.options 
                            ? `${Math.min(...s.options.map(o => o.time))} - ${Math.max(...s.options.map(o => o.time))} min` 
                            : `${s.time} min`}
                        </p>
                        <span className="text-lg font-mono font-bold mt-1 text-primary block">
                          {s.options 
                            ? `R$ ${Math.min(...s.options.map(o => o.price))} - R$ ${Math.max(...s.options.map(o => o.price))}` 
                            : `R$ ${s.price}`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-3 px-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground flex items-center gap-2">
                    ← Arraste para o lado →
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="flex justify-center">
                <div className="bg-secondary rounded-2xl p-4 border border-border">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleSelectDate}
                    locale={ptBR}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today || !isDayAllowed(date);
                    }}
                    className="pointer-events-auto"
                  />
                  <p className="text-xs text-muted-foreground mt-3 px-2 uppercase tracking-widest text-center">
                    Segunda a Sábado • Domingo Fechado
                  </p>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  {selectedDate && format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
                {loadingTimes ? (
                  <div className="col-span-full text-center text-sm text-muted-foreground py-8">
                    Carregando horários disponíveis...
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {availableTimes.map((time) => (
                      <button
                        key={time}
                        onClick={() => handleSelectTime(time)}
                        className={cn(
                          'py-3 rounded-xl font-mono font-medium border transition-all text-sm md:text-base',
                          selectedTime === time
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-secondary border-border hover:border-primary/50'
                        )}
                      >
                        {time}
                      </button>
                    ))}
                    {availableTimes.length === 0 && (
                      <p className="col-span-full text-center text-sm text-muted-foreground py-8">
                        Nenhum horário disponível nesta data (Dia Fechado).
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="max-w-md mx-auto">
                <div className="bg-secondary/50 rounded-2xl p-4 mb-6 border border-border text-sm space-y-1">
                  <p><span className="text-muted-foreground">Serviço:</span> <span className="font-semibold">{combinedServiceName}</span></p>
                  <p><span className="text-muted-foreground">Data:</span> <span className="font-semibold">{selectedDate && format(selectedDate, 'dd/MM/yyyy')}</span></p>
                  <p><span className="text-muted-foreground">Horário:</span> <span className="font-semibold">{selectedTime}</span></p>
                  <p><span className="text-muted-foreground">Valor:</span> <span className="font-semibold font-mono">R$ {totalPrice},00</span></p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Nome Completo</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Maria Silva"
                      className="w-full bg-secondary border border-border rounded-xl p-4 focus:border-primary outline-none transition-colors text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">WhatsApp</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="(41) 99999-9999"
                      maxLength={15}
                      className="w-full bg-secondary border border-border rounded-xl p-4 focus:border-primary outline-none transition-colors text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <button
                    onClick={handleConfirm}
                    disabled={!name.trim() || !phone.trim()}
                    className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl glow-shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                  >
                    Finalizar Agendamento
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <div className="bg-card p-8 rounded-3xl card-shadow w-full max-w-sm border border-border text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <h3 className="text-lg font-bold">Salvando seu Horário...</h3>
              <p className="text-muted-foreground text-sm">
                Estamos registrando seu agendamento na nossa agenda e preparando sua mensagem do WhatsApp.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Popup */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card p-8 rounded-3xl card-shadow w-full max-w-sm border border-border text-center relative"
            >
              <button
                onClick={() => setShowSuccess(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Agendamento Realizado!</h3>
              <p className="text-muted-foreground text-sm">
                Seu agendamento foi enviado com sucesso. Aguarde a confirmação do Studio pelo WhatsApp.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Maintenance Sub-selection Modal */}
      <AnimatePresence>
        {showOptionModal && pendingService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card p-6 md:p-8 rounded-3xl card-shadow w-full max-w-md border border-primary/20 relative text-center space-y-6"
            >
              <button
                onClick={() => {
                  setShowOptionModal(false);
                  setPendingService(null);
                }}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">Regra de Manutenção</h3>
                <p className="text-sm text-foreground/80 leading-relaxed text-center px-2">
                  Manutenção válida entre <span className="font-bold text-primary">15 e 22 dias</span>. Após esse período, será cobrado o valor de uma nova aplicação.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setSelectedService(pendingService);
                    setSelectedOption(null);
                    setPendingService(null);
                    setShowOptionModal(false);
                    setExtras([]);
                    setStep(2);
                  }}
                  className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Estou ciente e aceito
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pix Signal Modal */}
      <AnimatePresence>
        {showPixModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md my-4"
              style={{
                background: 'linear-gradient(135deg, #1a1208 0%, #0d0d0d 50%, #1a1208 100%)',
                borderRadius: '28px',
                padding: '2px',
                boxShadow: '0 0 60px rgba(180,140,60,0.25), 0 20px 60px rgba(0,0,0,0.8)',
              }}
            >
              {/* Golden border gradient wrapper */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #c9a227, #f0d060, #a07820, #f0d060, #c9a227)',
                  borderRadius: '28px',
                  padding: '2px',
                }}
              >
                <div
                  style={{
                    background: 'linear-gradient(160deg, #1c1407 0%, #0a0a0a 60%, #1c1407 100%)',
                    borderRadius: '26px',
                    padding: '32px 28px',
                  }}
                >
                  {/* Close button */}
                  <button
                    onClick={() => { setShowPixModal(false); setComprovanteFile(null); }}
                    className="absolute top-5 right-5 text-yellow-600/70 hover:text-yellow-400 transition-colors z-10"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {/* Header */}
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ background: 'linear-gradient(135deg, #c9a227, #f0d060)' }}>
                      <span className="text-black font-bold text-lg">✦</span>
                    </div>
                    <h3 className="text-xl font-bold text-yellow-300 tracking-wide">Garantia de Horário</h3>
                    <p className="text-yellow-600/80 text-sm mt-1 font-medium">Sinal de Agendamento</p>
                  </div>

                  {/* Info notice */}
                  <div className="rounded-xl p-3 mb-5 text-center text-xs leading-relaxed" style={{ background: 'rgba(201,162,39,0.1)', border: '1px solid rgba(201,162,39,0.25)', color: '#d4a843' }}>
                    Pedimos um sinal de <strong>R$ {SINAL_VALUE},00</strong> via Pix para garantir seu horário.<br />
                    <span style={{ color: '#a07820' }}>O valor é descontado no total do serviço no dia do atendimento.</span>
                  </div>

                  {/* QR Code */}
                  <div className="flex justify-center mb-5">
                    <div className="p-3 rounded-2xl" style={{ background: '#ffffff', boxShadow: '0 0 30px rgba(201,162,39,0.3)' }}>
                      <img
                        src="/pix-brenda.png"
                        alt="QR Code Pix - Brenda Coelho Batista"
                        className="w-44 h-44 object-contain rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${PIX_KEY}&bgcolor=FFFFFF&color=000000`;
                        }}
                      />
                    </div>
                  </div>

                  <p className="text-center text-xs text-yellow-600/70 mb-4">Brenda Coelho Batista • Pix Aleatório</p>

                  {/* Pix key copy */}
                  <div className="rounded-xl p-3 mb-5 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,162,39,0.2)' }}>
                    <span className="flex-1 text-xs font-mono truncate" style={{ color: '#c9a227' }}>{PIX_KEY}</span>
                    <button
                      onClick={handlePixCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0"
                      style={{
                        background: pixCopiado ? 'rgba(74,222,128,0.15)' : 'linear-gradient(135deg, #c9a227, #f0d060)',
                        color: pixCopiado ? '#4ade80' : '#000',
                        border: pixCopiado ? '1px solid #4ade80' : 'none',
                      }}
                    >
                      {pixCopiado ? <><Check className="w-3 h-3" /> Copiado!</> : <><Copy className="w-3 h-3" /> Copiar</>}
                    </button>
                  </div>

                  {/* Upload comprovante */}
                  <div className="mb-5">
                    <p className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#c9a227' }}>Comprovante do Pix *</p>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
                      className="rounded-xl p-5 text-center cursor-pointer transition-all"
                      style={{
                        background: isDragOver ? 'rgba(201,162,39,0.12)' : comprovanteFile ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `2px dashed ${isDragOver ? '#c9a227' : comprovanteFile ? '#4ade80' : 'rgba(201,162,39,0.3)'}`,
                      }}
                    >
                      {comprovanteFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <FileImage className="w-8 h-8" style={{ color: '#4ade80' }} />
                          <p className="text-xs font-medium" style={{ color: '#4ade80' }}>{comprovanteFile.name}</p>
                          <button
                            onClick={(e) => { e.stopPropagation(); setComprovanteFile(null); }}
                            className="text-xs underline"
                            style={{ color: '#a07820' }}
                          >Trocar arquivo</button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-7 h-7" style={{ color: '#c9a227' }} />
                          <p className="text-xs" style={{ color: '#a07820' }}>Arraste ou clique para anexar</p>
                          <p className="text-xs" style={{ color: '#5a4010' }}>JPG, PNG ou PDF • Máx 10MB</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                    />
                  </div>

                  {/* Confirm button */}
                  <button
                    onClick={handleSubmitWithComprovante}
                    disabled={!comprovanteFile || comprovanteUploading}
                    className="w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all"
                    style={{
                      background: comprovanteFile && !comprovanteUploading
                        ? 'linear-gradient(135deg, #c9a227, #f0d060, #c9a227)'
                        : 'rgba(255,255,255,0.08)',
                      color: comprovanteFile && !comprovanteUploading ? '#000' : '#555',
                      cursor: comprovanteFile && !comprovanteUploading ? 'pointer' : 'not-allowed',
                      boxShadow: comprovanteFile && !comprovanteUploading ? '0 0 30px rgba(201,162,39,0.4)' : 'none',
                    }}
                  >
                    {comprovanteUploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                        Enviando comprovante...
                      </span>
                    ) : (
                      '✦ Concluir e Confirmar no WhatsApp'
                    )}
                  </button>

                  {!comprovanteFile && (
                    <p className="text-center text-xs mt-3" style={{ color: '#5a4010' }}>
                      Anexe o comprovante para liberar o botão
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BookingSection;
