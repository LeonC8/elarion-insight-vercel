import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from './context/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Hotel Dashboard',
  description: 'Hotel Management Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=0.8" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <script dangerouslySetInnerHTML={{
          __html: `
            fetch('https://ask-whisper.pages.dev/chatbot-widget.js')
              .then(response => response.text())
              .then(code => {
                const script = document.createElement('script');
                script.textContent = code;
                document.body.appendChild(script);
                
                // Initialize after script is loaded
                initChatWidget({
                  welcomeMessage: "👋 Hi there! How can I help you today?",
                  primaryColor: "#2196f3",
                  title: "Chat with us",
                  subtitle: "We typically reply within 5 minutes"
                });
              });
          `
        }} />
      </body>
    </html>
  )
}