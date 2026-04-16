export type Service = {
  name: string;
  price: string;
  duration: string;
  description: string;
  featured?: boolean;
};

export const business = {
  name: "Crewe Cut Barber",
  tagline: "Sharp local barbering in Edinburgh",
  headline: "Sharp cuts, clean fades, beard work, and dependable seven-day service.",
  intro:
    "Crewe Cut Barber is a trusted local shop with straightforward pricing, seven-day opening, and a clean, modern standard of work. This site gives clients a clear way to explore services, see the shop, and request a convenient slot.",
  phone: "0131 629 4160",
  addressLine1: "218 Boswall Parkway",
  addressLine2: "Edinburgh, EH5 2LX",
  mapUrl:
    "https://www.google.com/maps?q=place_id:ChIJk0ZapCTHh0gRIy6q_9C0GL4&place_id=ChIJk0ZapCTHh0gRIy6q_9C0GL4",
  reviewSummary: "4.7 average rating from 120 Google reviews",
  hours: [
    { day: "Monday - Saturday", value: "9:00AM - 7:00PM" },
    { day: "Sunday", value: "10:00AM - 6:00PM" }
  ]
};

export const services: Service[] = [
  {
    name: "Haircut",
    price: "£15",
    duration: "35 min",
    description: "Classic short back and sides, tidy modern shape, and a clean finish.",
    featured: true
  },
  {
    name: "Skin or Zero Fade",
    price: "£17",
    duration: "40 min",
    description: "Detailed blend work with a sharper outline and a stronger finish.",
    featured: true
  },
  {
    name: "Scissor Cut",
    price: "£16",
    duration: "35 min",
    description: "For longer texture, shape control, and a more tailored trim."
  },
  {
    name: "Kids Haircut (Under 12)",
    price: "£13",
    duration: "30 min",
    description: "Simple and clean trim for younger clients."
  },
  {
    name: "Kids Skin or Zero Fade",
    price: "£16",
    duration: "35 min",
    description: "Fade service for under-12s with a cleaner modern finish."
  },
  {
    name: "All Over",
    price: "£12",
    duration: "20 min",
    description: "Quick even clipper cut for clients who want it straightforward."
  },
  {
    name: "Hot Towel Shave",
    price: "£17",
    duration: "30 min",
    description: "Traditional shave service with hot towel prep and a close finish."
  },
  {
    name: "Hot Towel Head Shave",
    price: "£17",
    duration: "30 min",
    description: "Close head shave with hot towel prep."
  },
  {
    name: "Beard Trim and Shape Up",
    price: "£13",
    duration: "20 min",
    description: "Beard clean-up, definition, and shape refinement."
  },
  {
    name: "Beard Trim",
    price: "£8",
    duration: "15 min",
    description: "Simple beard length clean-up."
  },
  {
    name: "Shape Up",
    price: "£8",
    duration: "15 min",
    description: "Quick edge-up for a sharper outline."
  },
  {
    name: "Threading",
    price: "£8",
    duration: "15 min",
    description: "Quick detail clean-up."
  },
  {
    name: "Old Age Pensioner (67+)",
    price: "£13",
    duration: "30 min",
    description: "Reduced-price haircut service."
  },
  {
    name: "Double Zero",
    price: "£5",
    duration: "10 min",
    description: "Very short clipper service."
  },
  {
    name: "Nose Wax and Ear Wax",
    price: "£7",
    duration: "10 min",
    description: "Small grooming add-on."
  }
];

export const gallery = [
  {
    image: "/images/storefront.jpg",
    title: "Street-facing storefront",
    text: "The actual exterior and signage clients already recognise."
  },
  {
    image: "/images/interior-wide.jpg",
    title: "Full station line",
    text: "Warm lighting, wood finishes, and a clean row of barber chairs."
  },
  {
    image: "/images/interior-row.jpg",
    title: "Working interior",
    text: "Real in-shop layout used as the core visual language for this rebuild."
  },
  {
    image: "/images/chairs.jpg",
    title: "Chair detail",
    text: "Classic barber setup with a more premium presentation."
  },
  {
    image: "/images/cut-detail.jpg",
    title: "Cut result",
    text: "Actual finished work from the shop."
  },
  {
    image: "/images/fade-finish.jpg",
    title: "Fade finish",
    text: "Clean blend detail using a real customer result."
  },
  {
    image: "/images/client-chair.jpg",
    title: "Service in progress",
    text: "Real chair-side shot from inside the shop."
  }
];

export const highlights = [
  "Open 7 days",
  "No appointment necessary",
  "Actual in-shop photography only",
  "Straightforward pricing"
];
