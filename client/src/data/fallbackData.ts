import { Category, Product, Banner, StoreSettings, CartItem } from '../types';

export const FALLBACK_SETTINGS: StoreSettings = {
  store_name: 'VK Technology',
  owner_email: 'karthik.suroju@gmail.com',
  owner_name: 'S. J. V. Karthik',
  business_phone: '+91 8555997052',
  business_address: 'Pedamiram, West Godavari, Andhra Pradesh, India',
  currency_code: 'INR',
  currency_symbol: '₹',
  standard_shipping_fee: '60',
  free_shipping_threshold: '999',
  cod_available: 'false',
  cod_fee: '0',
  estimated_dispatch: '1-2 Weeks',
  support_hours: 'Monday - Saturday: 9:00 AM - 8:00 PM IST',
  announcement_text: 'FREE delivery on orders over ₹999 • Estimated Delivery: 1-2 Weeks',
  owner_whatsapp_number: '+91 8555997052',
  upi_qr_enabled: 'true',
  upi_id: '8555997052@ibl',
  upi_payee_name: 'Mr Suroju Jnana Venkata Karthik',
  upi_qr_image_url: '/upi-qr-code.jpg'
};

export const FALLBACK_CATEGORIES: Category[] = [
  {
    id: 1,
    slug: 'arduino-boards-and-kits',
    name: 'Arduino Boards and Kits',
    description: 'Official and compatible Arduino boards, starter kits, microcontrollers, and expansion shields.',
    icon: 'Cpu',
    image_url: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=600&q=80',
    sort_order: 1,
    is_active: 1
  },
  {
    id: 2,
    slug: 'esp32-and-esp8266',
    name: 'ESP32 and ESP8266',
    description: 'High-performance Wi-Fi and Bluetooth microcontrollers for IoT and smart connected devices.',
    icon: 'Wifi',
    image_url: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=600&q=80',
    sort_order: 2,
    is_active: 1
  },
  {
    id: 3,
    slug: 'raspberry-pi',
    name: 'Raspberry Pi',
    description: 'Single board computers, official accessories, compute modules, displays, and cameras.',
    icon: 'Terminal',
    image_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80',
    sort_order: 3,
    is_active: 1
  },
  {
    id: 4,
    slug: 'iot-development-kits',
    name: 'IoT Development Kits',
    description: 'Plug-and-play kits for home automation, smart agriculture, industrial monitoring, and cloud telemetry.',
    icon: 'Globe',
    image_url: 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=600&q=80',
    sort_order: 4,
    is_active: 1
  },
  {
    id: 5,
    slug: 'sensors-and-modules',
    name: 'Sensors and Modules',
    description: 'Environmental, motion, optical, biometric, gas, and proximity sensors for all embedded projects.',
    icon: 'Activity',
    image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    sort_order: 5,
    is_active: 1
  },
  {
    id: 6,
    slug: 'robotics-kits',
    name: 'Robotics Kits',
    description: 'DIY 4WD robot chassis, line followers, obstacle avoiders, robotic arms, and bipedal kits.',
    icon: 'Bot',
    image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80',
    sort_order: 6,
    is_active: 1
  },
  {
    id: 7,
    slug: 'drone-components',
    name: 'Drone Components',
    description: 'Quadcopter frames, brushless motors, ESCs, flight controllers, propellers, and transmitters.',
    icon: 'Navigation',
    image_url: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=600&q=80',
    sort_order: 7,
    is_active: 1
  },
  {
    id: 8,
    slug: 'motors-and-motor-drivers',
    name: 'Motors and Motor Drivers',
    description: 'Stepper motors, servo motors, DC gear motors, L298N, TB6600, and PCA9685 driver boards.',
    icon: 'Zap',
    image_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80',
    sort_order: 8,
    is_active: 1
  },
  {
    id: 9,
    slug: 'electronic-components',
    name: 'Electronic Components',
    description: 'Resistors, capacitors, diodes, LEDs, transistors, ICs, relays, and solderless breadboards.',
    icon: 'Layers',
    image_url: 'https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=600&q=80',
    sort_order: 9,
    is_active: 1
  },
  {
    id: 10,
    slug: 'pcb-tools-and-accessories',
    name: 'PCB Tools and Accessories',
    description: 'Soldering stations, brass cleaners, flux, copper clad boards, wire strippers, and multimeters.',
    icon: 'Wrench',
    image_url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=600&q=80',
    sort_order: 10,
    is_active: 1
  },
  {
    id: 11,
    slug: 'power-supplies-and-batteries',
    name: 'Power Supplies and Batteries',
    description: 'LiPo batteries, 18650 cells, BMS protection boards, buck/boost converters, and AC-DC adapters.',
    icon: 'BatteryCharging',
    image_url: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=600&q=80',
    sort_order: 11,
    is_active: 1
  },
  {
    id: 12,
    slug: 'communication-modules',
    name: 'Communication Modules',
    description: 'LoRa 868/915MHz, NRF24L01+, Bluetooth HC-05, GSM/GPRS SIM800L, and GPS NEO-6M modules.',
    icon: 'Radio',
    image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    sort_order: 12,
    is_active: 1
  },
  {
    id: 13,
    slug: 'ai-and-machine-learning-kits',
    name: 'AI and Machine Learning Kits',
    description: 'Edge AI hardware, ESP32-CAM, Raspberry Pi AI Kit, Google Coral Edge TPU, and Jetson boards.',
    icon: 'Brain',
    image_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=600&q=80',
    sort_order: 13,
    is_active: 1
  },
  {
    id: 14,
    slug: 'student-diy-project-kits',
    name: 'Student DIY Project Kits',
    description: 'Complete final year and diploma project kits with source code, circuit diagrams, and documentation.',
    icon: 'BookOpen',
    image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80',
    sort_order: 14,
    is_active: 1
  },
  {
    id: 15,
    slug: 'cables-connectors-and-accessories',
    name: 'Cables, Connectors and Accessories',
    description: 'Dupont jumper wires, JST connectors, USB cables, terminal blocks, standoffs, and fasteners.',
    icon: 'Link',
    image_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
    sort_order: 15,
    is_active: 1
  }
];

export const FALLBACK_BANNERS: Banner[] = [
  {
    id: 1,
    title: 'Build Your Ideas with VK Technology',
    subtitle: 'Explore DIY Electronics, Robotics, IoT Components and Innovative Project Kits.',
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=85',
    link_url: '/category/arduino-boards-and-kits',
    button_text: 'Shop Now',
    display_order: 1,
    is_active: 1
  },
  {
    id: 2,
    title: 'IoT & Smart Connected Hardware',
    subtitle: 'Build remote telemetry, home automation, and smart agriculture with ESP32 & LoRa.',
    image_url: 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=1600&q=85',
    link_url: '/category/esp32-and-esp8266',
    button_text: 'Explore IoT Kits',
    display_order: 2,
    is_active: 1
  },
  {
    id: 3,
    title: 'Engineering Student Project Kits',
    subtitle: 'Ready-to-build final year electronics kits with complete source code & schematics.',
    image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1600&q=85',
    link_url: '/category/student-diy-project-kits',
    button_text: 'View Project Kits',
    display_order: 3,
    is_active: 1
  }
];

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 1,
    slug: 'arduino-uno-r4-wifi-original',
    name: 'Arduino UNO R4 WiFi Development Board (Original Renesas RA4M1)',
    sku: 'VK-ARD-001',
    category_id: 1,
    category_slug: 'arduino-boards-and-kits',
    category_name: 'Arduino Boards and Kits',
    subcategory: 'Development Boards',
    short_description: '32-bit ARM Cortex-M4 microcontroller with ESP32-S3 for Wi-Fi & Bluetooth, 12x8 LED matrix, and Qwiic connector.',
    description: 'The Arduino UNO R4 WiFi merges the tested form-factor of the UNO with the processing power of Renesas RA4M1 32-bit ARM Cortex-M4 and the wireless connectivity of the ESP32-S3. Features an onboard 12x8 red LED matrix for real-time animations, USB-C programming, built-in DAC, CAN bus support, and an operational voltage of 5V.',
    regular_price: 2499,
    discounted_price: 1999,
    stock_quantity: 45,
    brand: 'Arduino Compatible',
    rating_avg: 4.9,
    rating_count: 14,
    is_featured: 1,
    is_active: 1,
    primary_image: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=800&q=80',
    images: [
      { id: 1, image_url: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=800&q=80', sort_order: 0, is_primary: 1 },
      { id: 2, image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80', sort_order: 1, is_primary: 0 }
    ],
    features: [
      'Powerful 32-bit processing at 48MHz for demanding computation',
      'Integrated ESP32-S3 wireless module for cloud IoT integration',
      '12x8 Onboard red LED matrix for displaying graphics & sensor values',
      'HID support allows simulating keyboard and mouse via USB',
      'Compatible with standard Arduino shields and accessories'
    ],
    specifications: {
      'Microcontroller': 'Renesas RA4M1 (Arm Cortex-M4)',
      'Clock Speed': '48 MHz',
      'Wireless': 'ESP32-S3-MINI-1 (Wi-Fi 802.11 b/g/n & BLE 5.0)',
      'Operating Voltage': '5V DC',
      'Input Voltage (Vin)': '6-24V',
      'Digital I/O Pins': '14 (6 PWM)',
      'Analog Input Pins': '6 (14-bit ADC)',
      'Flash Memory': '256 KB',
      'SRAM': '32 KB'
    }
  },
  {
    id: 2,
    slug: 'arduino-mega-2560-r3-kit',
    name: 'Arduino Mega 2560 R3 Board with High Speed USB Cable',
    sku: 'VK-ARD-002',
    category_id: 1,
    category_slug: 'arduino-boards-and-kits',
    category_name: 'Arduino Boards and Kits',
    subcategory: 'Development Boards',
    short_description: 'ATmega2560 board with 54 digital I/O pins, 16 analog inputs, and 4 hardware UARTs for 3D printers and large robotics.',
    description: 'Ideal for complex projects requiring numerous I/O lines like 3D printers, CNC routers, multi-axis robotic arms, and industrial monitoring. Powered by the Microchip ATmega2560 with 256 KB flash memory.',
    regular_price: 1250,
    discounted_price: 899,
    stock_quantity: 60,
    brand: 'VK Technology',
    rating_avg: 4.8,
    rating_count: 8,
    is_featured: 1,
    is_active: 1,
    primary_image: 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=800&q=80',
    images: [
      { id: 3, image_url: 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=800&q=80', sort_order: 0, is_primary: 1 }
    ],
    features: [
      '54 Digital input/output pins for maximum peripheral interfacing',
      '16 Analog inputs with 10-bit resolution',
      '4 Hardware serial channels for multiple communication modules',
      'Perfect for RAMPS 1.4 3D printer shields'
    ]
  },
  {
    id: 3,
    slug: 'arduino-45-in-1-ultimate-sensor-kit',
    name: 'Complete Arduino 45-in-1 Ultimate Sensor & Component Kit',
    sku: 'VK-ARD-003',
    category_id: 5,
    category_slug: 'sensors-and-modules',
    category_name: 'Sensors and Modules',
    subcategory: 'Starter Kits',
    short_description: 'Comprehensive kit featuring 45 distinct sensor modules, jumper wires, tutorials, and sturdy organizing box.',
    description: 'Master sensor interfacing with this curated 45-in-1 kit. Includes temperature, humidity, sound, flame, tilt, obstacle, ultrasonic, joystick, relay, and heartbeat sensors. Includes PDF guide and code samples.',
    regular_price: 1899,
    discounted_price: 1449,
    stock_quantity: 35,
    brand: 'VK Technology',
    rating_avg: 4.9,
    rating_count: 19,
    is_featured: 1,
    is_active: 1,
    primary_image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    images: [
      { id: 4, image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80', sort_order: 0, is_primary: 1 }
    ],
    features: [
      '45 Essential sensor modules in one neat kit',
      'Ideal for engineering students, hobbyists and makers',
      'Tested components with standard 2.54mm pin headers'
    ]
  },
  {
    id: 4,
    slug: 'esp32-wroom-32d-type-c-38pin',
    name: 'ESP32-WROOM-32D Dual-Core Wi-Fi + BLE DevKit (Type-C, 38-Pin)',
    sku: 'VK-ESP-001',
    category_id: 2,
    category_slug: 'esp32-and-esp8266',
    category_name: 'ESP32 and ESP8266',
    subcategory: 'Microcontrollers',
    short_description: 'Dual 240MHz Xtensa LX6 cores, integrated 802.11b/g/n Wi-Fi, BLE 4.2, Type-C USB port and CP2102 driver.',
    description: 'The premier development board for IoT makers. Features 38 GPIO pins, capacitive touch sensors, Hall sensor, high-speed SPI, UART, I2C, and dual-core processing capable of running FreeRTOS.',
    regular_price: 499,
    discounted_price: 349,
    stock_quantity: 120,
    brand: 'Espressif Systems',
    rating_avg: 4.9,
    rating_count: 31,
    is_featured: 1,
    is_active: 1,
    primary_image: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=800&q=80',
    images: [
      { id: 5, image_url: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=800&q=80', sort_order: 0, is_primary: 1 }
    ],
    features: [
      'Dual-core architecture allows offloading network stack to Core 0',
      'Modern Type-C connector for rock-solid programming',
      'Ultra-low power deep sleep modes (< 10 µA)'
    ]
  },
  {
    id: 5,
    slug: 'nodemcu-esp8266-v3-board',
    name: 'NodeMCU ESP8266 V3 Lua Wi-Fi Development Board (CH340G)',
    sku: 'VK-ESP-002',
    category_id: 2,
    category_slug: 'esp32-and-esp8266',
    category_name: 'ESP32 and ESP8266',
    subcategory: 'Microcontrollers',
    short_description: 'Popular compact Wi-Fi IoT microcontroller board with 4MB flash and breadboard-friendly design.',
    description: 'The quintessential affordable IoT board. Perfect for simple web servers, MQTT telemetry nodes, and smart home appliances connected to Blynk, Adafruit IO, or AWS IoT.',
    regular_price: 320,
    discounted_price: 249,
    stock_quantity: 85,
    brand: 'VK Technology',
    rating_avg: 4.7,
    rating_count: 12,
    is_featured: 0,
    is_active: 1,
    primary_image: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=800&q=80',
    images: [
      { id: 6, image_url: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=800&q=80', sort_order: 0, is_primary: 1 }
    ],
    features: [
      'Budget-friendly Wi-Fi connectivity for home automation',
      'Plug-and-play with Arduino IDE ESP8266 core',
      'Integrated TCP/IP protocol stack'
    ]
  },
  {
    id: 6,
    slug: 'raspberry-pi-5-8gb-ram',
    name: 'Raspberry Pi 5 8GB Single Board Computer (Broadcom BCM2712 Quad-Core)',
    sku: 'VK-RPI-001',
    category_id: 3,
    category_slug: 'raspberry-pi',
    category_name: 'Raspberry Pi',
    subcategory: 'Single Board Computers',
    short_description: 'Flagship single-board computer with 2.4GHz quad-core 64-bit Arm Cortex-A76, PCIe 2.0, dual 4K60 HDMI, and RTC.',
    description: '2 to 3 times faster than the previous generation. Boasts Broadcom BCM2712 silicon, Raspberry Pi RP1 I/O controller, PCIe 2.0 interface for NVMe SSD expansions, dedicated on/off power button, and real-time clock battery support.',
    regular_price: 9499,
    discounted_price: 8499,
    stock_quantity: 20,
    brand: 'Raspberry Pi Foundation',
    rating_avg: 5.0,
    rating_count: 24,
    is_featured: 1,
    is_active: 1,
    primary_image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80',
    images: [
      { id: 7, image_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80', sort_order: 0, is_primary: 1 }
    ],
    features: [
      'Unmatched desktop-class performance in credit-card form factor',
      'High-speed PCIe expansion port for NVMe SSD storage',
      'Hardware power button and dedicated RTC connector',
      'Runs Raspberry Pi OS, Ubuntu, Debian, and Kali Linux'
    ]
  },
  {
    id: 7,
    slug: '4wd-smart-robot-car-chassis-kit',
    name: '4WD Smart Robot Car Chassis Kit with Speed Encoders & Dual DC Motors',
    sku: 'VK-ROB-001',
    category_id: 6,
    category_slug: 'robotics-kits',
    category_name: 'Robotics Kits',
    subcategory: 'Chassis Kits',
    short_description: 'Dual layer acrylic 4-wheel drive robot chassis with 4 TT gear motors, speed measuring disks, and battery holder.',
    description: 'The foundation for obstacle avoidance, line-following, Bluetooth-controlled, or ROS autonomous mobile robots.',
    regular_price: 799,
    discounted_price: 549,
    stock_quantity: 50,
    brand: 'VK Technology',
    rating_avg: 4.8,
    rating_count: 17,
    is_featured: 1,
    is_active: 1,
    primary_image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
    images: [
      { id: 8, image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80', sort_order: 0, is_primary: 1 }
    ],
    features: [
      'Dual-layer sturdy acrylic plate structure with ample mounting holes',
      'Includes 4 TT gear motors with 1:48 reduction ratio',
      'Includes 4 high-grip rubber wheels and velocity encoder disks'
    ]
  },
  {
    id: 8,
    slug: 'f450-quadcopter-drone-diy-starter-kit',
    name: 'F450 Quadcopter Drone DIY Starter Kit with APM 2.8, 1000KV Motors & 30A ESC',
    sku: 'VK-DRN-001',
    category_id: 7,
    category_slug: 'drone-components',
    category_name: 'Drone Components',
    subcategory: 'DIY Drone Kits',
    short_description: 'Complete DIY drone kit with F450 frame with integrated PCB wiring, 4x A2212 1000KV brushless motors, 4x 30A ESCs, and 1045 propellers.',
    description: 'Build your own fully autonomous quadcopter. The F450 frame features high-strength glass fiber arms with integrated power distribution board.',
    regular_price: 6499,
    discounted_price: 5299,
    stock_quantity: 15,
    brand: 'VK Technology',
    rating_avg: 4.9,
    rating_count: 9,
    is_featured: 1,
    is_active: 1,
    primary_image: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80',
    images: [
      { id: 9, image_url: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80', sort_order: 0, is_primary: 1 }
    ],
    features: [
      'Durable ultra-strong polyamide frame with gold-plated power contacts',
      'High-thrust A2212 1000KV brushless motors with balanced propellers',
      'Complete package for robotics engineering and aerial research'
    ]
  },
  {
    id: 9,
    slug: 'iot-smart-agriculture-weather-station-kit',
    name: 'IoT Smart Agriculture & Weather Monitoring Kit with Soil Moisture, DHT22 & Rain Sensor',
    sku: 'VK-KIT-001',
    category_id: 14,
    category_slug: 'student-diy-project-kits',
    category_name: 'Student DIY Project Kits',
    subcategory: 'Final Year Kits',
    short_description: 'Final year engineering IoT project kit with ESP32, capacitive soil sensor, DHT22, rain sensor, 0.96 OLED, and IoT cloud dashboard code.',
    description: 'Complete capstone project kit. Collects soil moisture, ambient temperature, humidity, and rainfall data and transmits telemetry to cloud dashboards.',
    regular_price: 2999,
    discounted_price: 2299,
    stock_quantity: 28,
    brand: 'VK Technology',
    rating_avg: 4.9,
    rating_count: 22,
    is_featured: 1,
    is_active: 1,
    primary_image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
    images: [
      { id: 10, image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80', sort_order: 0, is_primary: 1 }
    ],
    features: [
      'Turnkey student project kit with full circuit schematics & source code',
      'Capacitive corrosion-resistant soil moisture probe',
      'Live IoT cloud data visualization with push notifications'
    ]
  }
];

export function filterFallbackProducts(params: {
  q?: string;
  category?: string;
  brand?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  rating?: number;
  featured?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
} = {}): {
  products: Product[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
} {
  let list = [...FALLBACK_PRODUCTS];

  if (params.q) {
    const query = params.q.toLowerCase().trim();
    list = list.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.short_description && p.short_description.toLowerCase().includes(query)) ||
      (p.brand && p.brand.toLowerCase().includes(query))
    );
  }

  if (params.category) {
    list = list.filter(p => p.category_slug === params.category);
  }

  if (params.brand) {
    list = list.filter(p => p.brand === params.brand);
  }

  if (params.min_price !== undefined) {
    list = list.filter(p => (p.discounted_price || p.regular_price) >= params.min_price!);
  }

  if (params.max_price !== undefined) {
    list = list.filter(p => (p.discounted_price || p.regular_price) <= params.max_price!);
  }

  if (params.in_stock) {
    list = list.filter(p => p.stock_quantity > 0);
  }

  if (params.rating) {
    list = list.filter(p => p.rating_avg >= params.rating!);
  }

  if (params.featured) {
    list = list.filter(p => Boolean(p.is_featured));
  }

  if (params.sort) {
    switch (params.sort) {
      case 'price_low_high':
        list.sort((a, b) => (a.discounted_price || a.regular_price) - (b.discounted_price || b.regular_price));
        break;
      case 'price_high_low':
        list.sort((a, b) => (b.discounted_price || b.regular_price) - (a.discounted_price || a.regular_price));
        break;
      case 'newest':
        list.sort((a, b) => b.id - a.id);
        break;
      case 'rating':
        list.sort((a, b) => b.rating_avg - a.rating_avg);
        break;
      default:
        break;
    }
  }

  const page = params.page || 1;
  const limit = params.limit || 48;
  const total = list.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = list.slice((page - 1) * limit, page * limit);

  return {
    products: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages
    }
  };
}

export function getLocalCart(): { items: CartItem[]; subtotal: number; count: number } {
  try {
    const raw = localStorage.getItem('vk_cart_items');
    const items: CartItem[] = raw ? JSON.parse(raw) : [];
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    return { items, subtotal, count };
  } catch (e) {
    return { items: [], subtotal: 0, count: 0 };
  }
}

export function addLocalCartItem(productId: number, quantity: number = 1): void {
  const { items } = getLocalCart();
  const existingIndex = items.findIndex(i => i.product_id === productId);
  if (existingIndex > -1) {
    items[existingIndex].quantity += quantity;
    items[existingIndex].total = items[existingIndex].quantity * items[existingIndex].price;
  } else {
    const prod = FALLBACK_PRODUCTS.find(p => p.id === productId);
    if (prod) {
      const price = prod.discounted_price || prod.regular_price;
      items.push({
        cart_item_id: Date.now(),
        product_id: prod.id,
        name: prod.name,
        slug: prod.slug,
        sku: prod.sku,
        price,
        regular_price: prod.regular_price,
        discounted_price: prod.discounted_price,
        stock_quantity: prod.stock_quantity,
        quantity,
        image_url: prod.primary_image || (prod.images && prod.images[0]?.image_url) || '',
        total: price * quantity
      });
    }
  }
  localStorage.setItem('vk_cart_items', JSON.stringify(items));
}

export function updateLocalCartQuantity(productId: number, quantity: number): void {
  const { items } = getLocalCart();
  const filtered = items.filter(i => {
    if (i.product_id === productId) {
      i.quantity = quantity;
      i.total = i.price * quantity;
      return quantity > 0;
    }
    return true;
  });
  localStorage.setItem('vk_cart_items', JSON.stringify(filtered));
}

export function removeLocalCartItem(productId: number): void {
  const { items } = getLocalCart();
  const filtered = items.filter(i => i.product_id !== productId);
  localStorage.setItem('vk_cart_items', JSON.stringify(filtered));
}

export function clearLocalCart(): void {
  localStorage.removeItem('vk_cart_items');
}


