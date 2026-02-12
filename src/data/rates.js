export const rates = [
  // Monofásico - Cortes
  { code: 'CS01', name: 'Corte en fusible o interruptor (tapa sin ranura)', price: 6.79, category: 'Corte Monofásico' },
  { code: 'CS02', name: 'Corte en Interruptor (tapa con ranura)', price: 5.49, category: 'Corte Monofásico' },
  { code: 'CS03', name: 'Corte en caja de medición (aislamiento de acometida)', price: 9.44, category: 'Corte Monofásico' },
  { code: 'CS04', name: 'Corte en línea aérea (Empalme)', price: 21.83, category: 'Corte Monofásico' },

  // Trifásico - Cortes
  { code: 'CS05', name: 'Corte en fusible o interruptor (tapa sin ranura)', price: 8.73, category: 'Corte Trifásico' },
  { code: 'CS06', name: 'Corte en Interruptor (tapa con ranura)', price: 10.03, category: 'Corte Trifásico' },
  { code: 'CS07', name: 'Corte en caja de medición (aislamiento de acometida)', price: 12.98, category: 'Corte Trifásico' },
  { code: 'CS08', name: 'Corte en línea aérea (Empalme)', price: 23.60, category: 'Corte Trifásico' },

  // Monofásico - Reconexiones
  { code: 'RX01', name: 'Reconexión en fusible o interruptor (tapa sin ranura)', price: 6.79, category: 'Reconexión Monofásica' },
  { code: 'RX02', name: 'Reconexión en Interruptor (tapa con ranura)', price: 5.49, category: 'Reconexión Monofásica' },
  { code: 'RX03', name: 'Reconexión en caja de medición (aislamiento de acometida)', price: 9.44, category: 'Reconexión Monofásica' },
  { code: 'RX04', name: 'Reconexión en línea aérea (Empalme)', price: 21.83, category: 'Reconexión Monofásica' },
  
  // Trifásico - Reconexiones
  { code: 'RX05', name: 'Reconexión en fusible o interruptor (tapa sin ranura)', price: 8.73, category: 'Reconexión Trifásica' },
  { code: 'RX06', name: 'Reconexión en Interruptor (tapa con ranura)', price: 10.03, category: 'Reconexión Trifásica' },
  { code: 'RX07', name: 'Reconexión en caja de medición (aislamiento de acometida)', price: 12.98, category: 'Reconexión Trifásica' },
  { code: 'RX08', name: 'Reconexión en línea aérea (Empalme)', price: 23.60, category: 'Reconexión Trifásica' },

  // Conexiones Monofásicas - Retiros
  { code: 'RT01', name: 'Retiros de Conexión aéreo', price: 43.66, category: 'Retiros Conexión Monofásica' },
  { code: 'RT02', name: 'Retiros de Conexión Subterránea', price: 76.70, category: 'Retiros Conexión Monofásica' },

  // Conexiones Trifásicas - Retiros
  { code: 'RT03', name: 'Retiros de Conexión aéreo', price: 51.92, category: 'Retiros Conexión Trifásica' },
  { code: 'RT04', name: 'Retiros de Conexión Subterránea', price: 76.70, category: 'Retiros Conexión Trifásica' },

  // Facturación
  { code: 'LM01', name: 'Lectura de Medidores de Energía Activa (Incluye Consistencia)', price: 0.55, category: 'Facturación' },
  { code: 'LM02', name: 'Lectura de Medidores Ubicado en Poste', price: 6.79, category: 'Facturación' },
  { code: 'LM03', name: 'Reparto de Recibos', price: 0.50, category: 'Facturación' },
  { code: 'LM04', name: 'Reparto de Notificación (documentos varios)', price: 5.90, category: 'Facturación' },

  // Actividades Complementarias
  { code: 'AC01', name: 'Inspección de Suministros', price: 8.85, category: 'Actividades Complementarias' },
  { code: 'AC02', name: 'Inspección de Suministros por repaso de cortes', price: 5.55, category: 'Actividades Complementarias' },
  { code: 'AC03', name: 'Codificación de código de ruta', price: 6.67, category: 'Actividades Complementarias' },
  { code: 'AC04', name: 'Reubicación de medidore de interiores', price: 135.70, category: 'Actividades Complementarias' },
  { code: 'AC05', name: 'Cambio de medidor monofásico', price: 37.76, category: 'Actividades Complementarias' },
  { code: 'AC06', name: 'Cambio de medidor trifásico', price: 44.84, category: 'Actividades Complementarias' },
  { code: 'AC07', name: 'Cambio de Interruptor termomagnético', price: 17.70, category: 'Actividades Complementarias' },

  // Gestión de Clientes Mayores (GCM)
  { code: 'GCM01', name: 'Corte en BT', price: 47.20, category: 'GCM' },
  { code: 'GCM02', name: 'Corte en MT PMI', price: 62.54, category: 'GCM' },
  { code: 'GCM03', name: 'Corte en MT-Celda', price: 82.00, category: 'GCM' },
  { code: 'GCM04', name: 'Reconexión en BT', price: 47.20, category: 'GCM' },
  { code: 'GCM05', name: 'Reconexión en MT-PMI', price: 62.54, category: 'GCM' },
  { code: 'GCM06', name: 'Reconexión en MT Celda', price: 82.00, category: 'GCM' },
  { code: 'GCM07', name: 'Conexión Básica en Baja Tensión', price: 141.60, category: 'GCM' },
  { code: 'GCM17', name: 'Lectura de Medidores Electrónicos Multifunción', price: 4.48, category: 'GCM' },
  { code: 'GCM18', name: 'Entrega de Recibos de Clientes Mayores', price: 4.07, category: 'GCM' },
  { code: 'GCM19', name: 'Descarga de estados y memoria masa del medidor Multifunción', price: 19.47, category: 'GCM' },
  { code: 'GCM20', name: 'Reparto de notificaciones, actas y resoluciones (documentos varios)', price: 5.66, category: 'GCM' },
  { code: 'GCM21', name: 'Atención de avería o falta de servicio en BT', price: 45.10, category: 'GCM' },
  { code: 'GCM22', name: 'Atención de avería o falta de servicio en MT', price: 54.28, category: 'GCM' },
  { code: 'GCM23', name: 'Instalación o cambio de medidor multifunción', price: 40.47, category: 'GCM' },
  { code: 'GCM24', name: 'Instalación o cambio de caja porta medidor', price: 69.38, category: 'GCM' },
  { code: 'GCM25', name: 'Instalación o cambio de sistema de protección en BT', price: 26.60, category: 'GCM' },
  { code: 'GCM26', name: 'Instalación o cambio de sistema de protección (Fusible MT)', price: 54.28, category: 'GCM' },
  { code: 'GCM27', name: 'Instalación o cambio de cable de control', price: 55.51, category: 'GCM' },
  { code: 'GCM28', name: 'Instalación o cambio de conductor de acometida en BT', price: 52.04, category: 'GCM' },
  { code: 'GCM29', name: 'Instalación o cambio de transformadores de medida en BT', price: 219.72, category: 'GCM' },
  { code: 'GCM30', name: 'Instalación o cambio de transformadores de medida en MT', price: 398.96, category: 'GCM' },
  { code: 'GCM31', name: 'Instalación o cambio de sistema de comunicación', price: 21.03, category: 'GCM' },
  { code: 'GCM32', name: 'Instalación o cambio de tubo bastón', price: 15.77, category: 'GCM' },
  { code: 'GCM33', name: 'Instalación o cambio de conductores aéreos en MT', price: 15.77, category: 'GCM' },
  { code: 'GCM34', name: 'Instalación y retiro de analizadores de redes', price: 72.85, category: 'GCM' },
  { code: 'GCM35', name: 'Picado de nicho para acondicionamiento de cajas portamedidores y tubo para acometida', price: 167.68, category: 'GCM' },
  { code: 'GCM36', name: 'Reubicación del Sistema de Medición en BT', price: 225.50, category: 'GCM' },
  { code: 'GCM37', name: 'Reubicación del Sistema de Medición en MT con Trafomix', price: 808.30, category: 'GCM' },
  { code: 'GCM38', name: 'Reubicación del Sistema de Medición en MT sin Trafomix', price: 262.82, category: 'GCM' },
  { code: 'GCM39', name: 'Medición de nivel de aislamiento de transformación de transformadores', price: 84.10, category: 'GCM' },
  { code: 'GCM40', name: 'Medición de nivel de aislamiento de transformadores de distribución', price: 73.59, category: 'GCM' },
  { code: 'GCM41', name: 'Medición de nivel de aislamiento de conductores y otras instalaciones', price: 89.36, category: 'GCM' },
  { code: 'GCM42', name: 'Medición de resistencia de pozo a tierra', price: 50.46, category: 'GCM' },
  { code: 'GCM43', name: 'Revisión de conexión - medición en BT', price: 94.61, category: 'GCM' },
  { code: 'GCM44', name: 'Revisión de conexión - medición en MT', price: 108.70, category: 'GCM' },
  { code: 'GCM45', name: 'Inspección para factibilidades de clientes mayores en BT y MT', price: 35.40, category: 'GCM' },
  { code: 'GCM46', name: 'Inspección por (consumo elevado, retiro, reubicación, reclamos, otros)', price: 102.66, category: 'GCM' },
  { code: 'GCM47', name: 'Construcción de Sistema de Puesta a Tierra', price: 878.86, category: 'GCM' },
  { code: 'GCM48', name: 'Construcción de murete', price: 879.10, category: 'GCM' },
  { code: 'GCM49', name: 'Instalación de terminaciones para cable en media tensión', price: 548.70, category: 'GCM' },
  { code: 'GCM50', name: 'Actualización de ubicación eléctrica de suministros en BT y MT', price: 40.47, category: 'GCM' }
];
