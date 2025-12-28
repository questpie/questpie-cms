import React from 'react';
import { defineAdminConfig, CurrencyInput, CalendarView } from '../lib/admin-config';
import { BarbershopModule } from '@questpie/core/modules/barbershop';

// Konfigurácia pre Admin UI vrstvu pre Barbershop modul
export const barbershopAdminConfig = defineAdminConfig({
  module: BarbershopModule, // Odkaz na backend modul
  
  resources: {
    // Konfigurácia pre kolekciu 'services'
    services: {
      list: {
        columns: ['name', 'price', 'durationMinutes'] // Stĺpce v tabuľkovom zobrazení
      },
      fields: {
        name: {
            label: 'Názov Služby',
            // komponent by mohol byť automaticky odvodený, alebo explicitne definovaný
        },
        price: {
          label: 'Cena Služby',
          description: 'Cena v eurách. Používajte iba celé čísla alebo desatinné miesta. (napr. 15.50)',
          component: <CurrencyInput currency="EUR" /> // Špecifický UI komponent
        },
        durationMinutes: {
            label: 'Dĺžka (minúty)',
        },
        description: {
            label: 'Popis Služby',
            // component: <RichTextEditor /> // Neskôr by tu mohol byť rich text editor
        }
      }
    },

    // Konfigurácia pre kolekciu 'barbers'
    barbers: {
        list: {
            columns: ['nickname', 'isActive']
        },
        fields: {
            nickname: {
                label: 'Meno Holiča',
            },
            bio: {
                label: 'O Holičovi',
                // component: <RichTextEditor />
            },
            isActive: {
                label: 'Aktívny?',
            }
        }
    },

    // Konfigurácia pre kolekciu 'appointments'
    appointments: {
      // Tu úplne prepíšeme zobrazenie zoznamu na custom kalendár komponent
      overrideListView: <CalendarView 
        groupBy="barber" // Vlastnosť pre custom komponent
        timeStart="09:00" 
        timeEnd="18:00" 
      />,
      fields: {
        startAt: {
            label: 'Začiatok Rezervácie',
            // component: <DateTimePicker />
        },
        endAt: {
            label: 'Koniec Rezervácie',
            // component: <DateTimePicker />
        },
        status: {
            label: 'Stav Rezervácie',
            // component: <Select options={['pending', 'confirmed', 'cancelled']} />
        },
        clientName: {
            label: 'Meno Klienta',
        },
        clientPhone: {
            label: 'Telefón Klienta',
        },
        clientEmail: {
            label: 'Email Klienta',
        },
        note: {
            label: 'Poznámka',
            // component: <Textarea />
        },
        barber: {
            label: 'Holič',
            // component: <RelationshipSelect collection="barbers" />
        },
        service: {
            label: 'Služba',
            // component: <RelationshipSelect collection="services" />
        }
      }
    }
  }
});
