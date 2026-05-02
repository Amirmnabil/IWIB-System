/**
 * @fileOverview Comprehensive database of car brands and models for the Egyptian market.
 */

export interface CarBrand {
  name: string;
  models: string[];
}

export const CAR_BRANDS: CarBrand[] = [
  {
    name: "Toyota",
    models: ["Corolla", "Yaris", "Fortuner", "Hilux", "Land Cruiser", "C-HR", "Rush", "Belta", "Rumion", "Camry", "Prado"]
  },
  {
    name: "Hyundai",
    models: ["Elantra HD", "Elantra AD", "Elantra CN7", "Accent RB", "Accent HCI", "Tucson", "Creta", "Bayon", "i10", "i20", "Santa Fe"]
  },
  {
    name: "Kia",
    models: ["Cerato", "Sportage", "Picanto", "Rio", "XCeed", "Exeed", "Carens", "Seltos", "Sorento", "K8"]
  },
  {
    name: "Nissan",
    models: ["Sunny", "Sentra", "Qashqai", "Juke", "X-Trail", "Patrol", "Navara"]
  },
  {
    name: "MG",
    models: ["MG 5", "MG 6", "MG ZS", "MG RX5", "MG HS", "MG ZS EV", "MG 4"]
  },
  {
    name: "Chery",
    models: ["Tiggo 3", "Tiggo 4", "Tiggo 7", "Tiggo 8", "Arrizo 5", "Envy"]
  },
  {
    name: "Chevrolet",
    models: ["Optra", "Captiva", "Aveo", "Cruze", "Move", "Lanos", "T-Series"]
  },
  {
    name: "Mitsubishi",
    models: ["Lancer", "Eclipse Cross", "Xpander", "Mirage", "Attrage", "Pajero"]
  },
  {
    name: "Fiat",
    models: ["Tipo", "500", "500X", "Punto", "Linea"]
  },
  {
    name: "Renault",
    models: ["Logan", "Sandero", "Stepway", "Duster", "Megane", "Kadjar", "Austral", "Taliant"]
  },
  {
    name: "Peugeot",
    models: ["301", "2008", "3008", "5008", "508", "408"]
  },
  {
    name: "Citroen",
    models: ["C-Elysee", "C3", "C3 Aircross", "C4", "C5 Aircross", "C4X"]
  },
  {
    name: "Opel",
    models: ["Astra", "Corsa", "Crossland", "Grandland", "Mokka", "Insignia"]
  },
  {
    name: "Volkswagen",
    models: ["Golf", "Tiguan", "Passat", "T-Roc", "Teramont", "Touareg", "Caddy"]
  },
  {
    name: "Skoda",
    models: ["Octavia", "Kodiaq", "Superb", "Karoq", "Kamiq", "Scala", "Fabia"]
  },
  {
    name: "Seat",
    models: ["Ibiza", "Leon", "Ateca", "Tarraco", "Arona"]
  },
  {
    name: "Suzuki",
    models: ["Alto", "Espresso", "Dzire", "Swift", "Baleno", "Vitara", "Jimny", "Ertiga", "Ciaz", "Celerio"]
  },
  {
    name: "Mercedes-Benz",
    models: ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "GLA", "CLA", "CLS", "A-Class", "G-Class", "V-Class"]
  },
  {
    name: "BMW",
    models: ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "7 Series", "X1", "X2", "X3", "X4", "X5", "X6", "X7"]
  },
  {
    name: "Audi",
    models: ["A1", "A3", "A4", "A5", "A6", "A8", "Q2", "Q3", "Q5", "Q7", "Q8", "e-tron"]
  },
  {
    name: "Volvo",
    models: ["S60", "S90", "XC40", "XC60", "XC90"]
  },
  {
    name: "Jeep",
    models: ["Grand Cherokee", "Wrangler", "Renegade", "Compass"]
  },
  {
    name: "Land Rover",
    models: ["Range Rover", "Range Rover Sport", "Velar", "Evoque", "Defender", "Discovery"]
  },
  {
    name: "Subaru",
    models: ["XV", "Impreza", "Forester"]
  },
  {
    name: "BYD",
    models: ["F3", "L3", "S5"]
  },
  {
    name: "Haval",
    models: ["Jolion", "H6"]
  },
  {
    name: "Geely",
    models: ["Emgrand", "Coolray", "Okavango", "Geometry C", "GX3 Pro"]
  },
  {
    name: "Jetour",
    models: ["X70", "X70 Plus", "X90 Plus", "Dashing"]
  },
  {
    name: "Alfa Romeo",
    models: ["Giulia", "Stelvio", "Tonale"]
  },
  {
    name: "Honda",
    models: ["Civic", "City", "CR-V", "HR-V"]
  }
];
