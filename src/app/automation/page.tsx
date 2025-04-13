import { WebAutomationInterface } from '@/components/WebAutomationInterface';

export const metadata = {
  title: 'Automatisation Web avec IA locale',
  description: 'Interface d\'automatisation web utilisant Ollama et DeepSeek pour l\'analyse et l\'automatisation de tâches.',
};

export default function AutomationPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-green-800">
          Automatisation Web avec IA locale
        </h1>
        <WebAutomationInterface />
      </div>
    </main>
  );
} 