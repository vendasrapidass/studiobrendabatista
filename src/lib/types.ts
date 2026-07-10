export interface ServiceOption {
  label: string;
  price: number;
  time: number;
}

export interface Service {
  name: string;
  time: number;
  price: number;
  image: string;
  category: string;
  options?: ServiceOption[];
}

export interface ScheduleBlock {
  id: string;
  date: string;
  allDay: boolean;
  start?: string;
  end?: string;
  reason: string;
}

export interface Booking {
  id: string;
  service: string;
  price: number;
  date: string;
  time: string;
  name: string;
  phone: string;
  status: 'pending' | 'accepted' | 'completed';
}

export const SERVICES: Service[] = [
  // Cílios - Aplicação
  { name: 'Volume Brasileiro', time: 90, price: 160, image: 'https://i.imgur.com/OJ5KOJW.jpeg', category: 'Cílios - Aplicação' },
  { name: 'Volume Egípcio', time: 90, price: 165, image: 'https://i.imgur.com/nhJeVtG.jpeg', category: 'Cílios - Aplicação' },
  { name: 'Lash Rímel Glow', time: 90, price: 165, image: 'https://i.imgur.com/9hnTIMB.jpeg', category: 'Cílios - Aplicação' },
  { name: 'Efeito Fox', time: 90, price: 165, image: 'https://i.imgur.com/cgVl6Iu.jpeg', category: 'Cílios - Aplicação' },
  { name: 'Mega Egípcio', time: 120, price: 180, image: 'https://i.imgur.com/IBcYbpI.jpeg', category: 'Cílios - Aplicação' },
  { name: 'Mega Fada', time: 120, price: 185, image: 'https://i.imgur.com/SzmT968.jpeg', category: 'Cílios - Aplicação' },
  { name: 'Mega Brasileiro', time: 120, price: 175, image: 'https://i.imgur.com/85hifhM.jpeg', category: 'Cílios - Aplicação' },
  { name: 'Lash Lifting', time: 90, price: 110, image: 'https://i.imgur.com/IQZ0AhJ.jpeg', category: 'Cílios - Aplicação' },
  { name: 'Brow Lamination', time: 100, price: 110, image: 'https://i.imgur.com/hzv1r1T.jpeg', category: 'Cílios - Aplicação' },

  // Cílios - Manutenção
  {
    name: 'Manutenção Volume Brasileiro',
    time: 60,
    price: 115,
    image: 'https://i.imgur.com/1qInlNx.jpeg',
    category: 'Cílios - Manutenção',
    options: [
      { label: 'Até 20 dias', price: 115, time: 60 },
      { label: 'Após 20 dias', price: 125, time: 90 }
    ]
  },
  {
    name: 'Manutenção Volume Egípcio',
    time: 60,
    price: 125,
    image: 'https://i.imgur.com/ZmwUp4n.jpeg',
    category: 'Cílios - Manutenção',
    options: [
      { label: 'Até 20 dias', price: 125, time: 60 },
      { label: 'Após 20 dias', price: 135, time: 90 }
    ]
  },
  {
    name: 'Manutenção Lash Rímel Glow',
    time: 60,
    price: 120,
    image: 'https://i.imgur.com/9UAhSTj.jpeg',
    category: 'Cílios - Manutenção',
    options: [
      { label: 'Até 20 dias', price: 120, time: 60 },
      { label: 'Após 20 dias', price: 140, time: 90 }
    ]
  },
  {
    name: 'Manutenção Efeito Fox',
    time: 60,
    price: 120,
    image: 'https://i.imgur.com/YfaPS3o.jpeg',
    category: 'Cílios - Manutenção',
    options: [
      { label: 'Até 20 dias', price: 120, time: 60 },
      { label: 'Após 20 dias', price: 140, time: 90 }
    ]
  },
  {
    name: 'Manutenção Mega Egípcio',
    time: 110,
    price: 135,
    image: 'https://i.imgur.com/yVCA8vT.jpeg',
    category: 'Cílios - Manutenção',
    options: [
      { label: 'Até 20 dias', price: 135, time: 110 },
      { label: 'Após 20 dias', price: 140, time: 120 }
    ]
  },
  {
    name: 'Manutenção Mega Fada',
    time: 110,
    price: 140,
    image: 'https://i.imgur.com/qbJMqXw.jpeg',
    category: 'Cílios - Manutenção',
    options: [
      { label: 'Até 20 dias', price: 140, time: 110 },
      { label: 'Após 20 dias', price: 145, time: 120 }
    ]
  },
  {
    name: 'Manutenção Mega Brasileiro',
    time: 110,
    price: 135,
    image: 'https://i.imgur.com/NfoUWim.jpeg',
    category: 'Cílios - Manutenção',
    options: [
      { label: 'Até 20 dias', price: 135, time: 110 },
      { label: 'Após 20 dias', price: 145, time: 120 }
    ]
  },

  // Remoção cílios
  { name: 'Remoção de Extensão', time: 15, price: 30, image: 'https://i.imgur.com/DQD6AtA.jpeg', category: 'Remoção cílios' },

  // Design - Sobrancelha
  { name: 'Design com Henna', time: 40, price: 45, image: 'https://i.imgur.com/6KJ7XOG.jpeg', category: 'Design - Sobrancelha' },
  { name: 'Design Personalizado', time: 30, price: 35, image: 'https://i.imgur.com/xqTJgnR.jpeg', category: 'Design - Sobrancelha' },

  // Limpeza de Pele
  { name: 'Limpeza de Pele', time: 60, price: 100, image: 'https://i.imgur.com/5NEvvvx.jpeg', category: 'Limpeza de Pele' }
];

export const GALLERY_IMAGES = [
  'https://i.imgur.com/BJAr6kV.jpeg',
  'https://i.imgur.com/4pC6z2c.jpeg',
  'https://i.imgur.com/Ys2HQKv.jpeg',
  'https://i.imgur.com/52GJL0i.jpeg',
  'https://i.imgur.com/PVkOL5G.jpeg'
];

export const WHATSAPP_NUMBER = '554187749945';

export function isOpenNow(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeValue = hour * 60 + minute;

  if (day === 0) return false; // Fechado aos Domingos
  if (day === 6) {
    // Sábados: 08:30 às 18:00
    return timeValue >= 510 && timeValue < 1080;
  }
  // Segunda a Sexta: 08:00 às 20:30
  return timeValue >= 480 && timeValue < 1230;
}

export function isDayAllowed(date: Date): boolean {
  return date.getDay() !== 0; // Fechado aos Domingos
}

export function getTimesForDate(date: Date): string[] {
  const day = date.getDay();
  if (day === 0) return []; // Domingos
  if (day === 6) {
    // Sábados: 08:30, 12:30 e 15:30
    return ['08:30', '12:30', '15:30'];
  }
  // Segunda a Sexta: 08:00, 14:00, 17:00, 17:30, 18:00 e 18:30
  return ['08:00', '14:00', '17:00', '17:30', '18:00', '18:30'];
}

export function getBookingDuration(serviceName: string): number {
  const names = serviceName.split(' + ');
  let total = 0;
  names.forEach(name => {
    let baseName = name;
    let optionLabel = '';
    if (name.includes(' - ')) {
      const parts = name.split(' - ');
      baseName = parts[0];
      optionLabel = parts[1];
    }
    const svc = SERVICES.find(s => s.name === baseName);
    if (svc) {
      if (svc.options && optionLabel) {
        const opt = svc.options.find(o => o.label === optionLabel);
        if (opt) {
          total += opt.time;
          return;
        }
      }
      total += svc.time;
    }
  });
  return total || 120; // padrão 120min se não encontrado
}

export function generateWhatsAppUrl(phone: string, message: string): string {
  return `https://api.whatsapp.com/send?phone=${phone.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`;
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

