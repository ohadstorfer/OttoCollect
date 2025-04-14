
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        ottoman: {
          DEFAULT: '#9C6644',
          50: '#EFE2D9',
          100: '#E5D0C3',
          200: '#D4B197',
          300: '#C3936B',
          400: '#B1784F',
          500: '#9C6644',
          600: '#7A5036',
          700: '#583A27',
          800: '#362318',
          900: '#140D09',
          950: '#070504'
        },
        parchment: {
          DEFAULT: '#F7F0E5',
          50: '#FFFFFF',
          100: '#FFFFFF',
          200: '#FFFFFF',
          300: '#FFFFFF',
          400: '#FFFFFF',
          500: '#F7F0E5',
          600: '#E7D5B6',
          700: '#D7BB87',
          800: '#C7A058',
          900: '#A6822F',
          950: '#8E7028'
        },
        gold: {
          DEFAULT: '#D4AF37',
          50: '#F8F1DC',
          100: '#F4E9C9',
          200: '#ECDAA3',
          300: '#E3CA7D',
          400: '#DBBA57',
          500: '#D4AF37',
          600: '#AF8C22',
          700: '#816719',
          800: '#544310',
          900: '#262008',
          950: '#121004'
        },
        dark: {
          DEFAULT: '#1A1A1A',
          50: '#8C8C8C',
          100: '#808080',
          200: '#676767',
          300: '#4F4F4F',
          400: '#363636',
          500: '#1A1A1A',
          600: '#000000',
          700: '#000000',
          800: '#000000',
          900: '#000000',
          950: '#000000'
        },
        // Light mode page-specific background colors
        'page-default': '#F9FAFB', // Soft Gray
        'page-home': '#FFF9F0',    // Peach Tint
        'page-marketplace': '#F0F9FF', // Powder Blue
        'page-collection': '#F3FAF4', // Mint Cream
        'page-profile': '#FFF1F3',  // Blush Pink
        'page-forum': '#F8F4FF',    // Lavender Mist
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(10px)" }
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        "scale-out": {
          from: { transform: "scale(1)", opacity: "1" },
          to: { transform: "scale(0.95)", opacity: "0" }
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" }
        },
        "slide-out": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" }
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" }
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" }
        },
        "typewriter": {
          "0%": { width: "0" },
          "20%": { width: "100%" },
          "80%": { width: "100%" },
          "100%": { width: "0" }
        },
        "cursor": {
          "0%": { borderRight: "2px solid transparent" },
          "100%": { borderRight: "2px solid #9C6644" }
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" }
        },
        "floating": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" }
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.7s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "scale-in": "scale-in 0.5s ease-out",
        "scale-out": "scale-out 0.2s ease-out",
        "slide-in": "slide-in 0.5s ease-out",
        "slide-out": "slide-out 0.3s ease-out",
        "pulse-subtle": "pulse-subtle 3s infinite ease-in-out",
        "shimmer": "shimmer 4s linear infinite",
        "typewriter": "typewriter 2s ease-in-out infinite",
        "cursor": "cursor 1s ease-in-out infinite",
        "bounce-subtle": "bounce-subtle 0.5s ease-in-out",
        "floating": "floating 3s ease-in-out infinite",
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif']
      },
      backgroundImage: {
        'gradient-light': 'linear-gradient(to right, rgba(255,255,255,0.7), rgba(255,255,255,0.3))',
      },
      boxShadow: {
        'light-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'light': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'light-md': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'light-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
