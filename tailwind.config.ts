import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  			display: ['var(--font-display)', 'var(--font-inter)', 'ui-sans-serif', 'sans-serif'],
  		},
  		colors: {
  			brand: {
  				ink: 'hsl(var(--brand-ink))',
  				deep: 'hsl(var(--brand-deep))',
  				teal: 'hsl(var(--brand-teal))',
  				lagoon: 'hsl(var(--brand-lagoon))',
  				coral: 'hsl(var(--brand-coral))',
  				sun: 'hsl(var(--brand-sun))',
  				sand: 'hsl(var(--brand-sand))'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			'4xl': '2rem'
  		},
  		boxShadow: {
  			glow: '0 0 0 1px rgb(20 160 148 / 0.10), 0 18px 50px -12px rgb(20 160 148 / 0.40)',
  			'glow-warm': '0 0 0 1px rgb(242 106 69 / 0.12), 0 18px 50px -12px rgb(242 106 69 / 0.45)',
  			lift: '0 1px 2px rgb(15 23 42 / 0.04), 0 12px 32px -8px rgb(15 23 42 / 0.12)',
  			float: '0 24px 70px -20px rgb(15 23 42 / 0.45)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'fade-up': {
  				from: { opacity: '0', transform: 'translateY(20px)' },
  				to: { opacity: '1', transform: 'none' }
  			},
  			'fade-in': {
  				from: { opacity: '0' },
  				to: { opacity: '1' }
  			},
  			float: {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-14px)' }
  			},
  			aurora: {
  				'0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
  				'33%': { transform: 'translate3d(6%,-8%,0) scale(1.12)' },
  				'66%': { transform: 'translate3d(-6%,6%,0) scale(0.94)' }
  			},
  			marquee: {
  				from: { transform: 'translateX(0)' },
  				to: { transform: 'translateX(-50%)' }
  			},
  			shine: {
  				'0%': { backgroundPosition: '0% 50%' },
  				'100%': { backgroundPosition: '200% 50%' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-up': 'fade-up 0.8s cubic-bezier(0.16,1,0.3,1) both',
  			'fade-in': 'fade-in 1s ease both',
  			float: 'float 7s ease-in-out infinite',
  			aurora: 'aurora 18s ease-in-out infinite',
  			marquee: 'marquee 38s linear infinite',
  			shine: 'shine 6s linear infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
