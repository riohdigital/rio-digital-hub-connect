
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

export default function LandingPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-background border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="RIOH DIGITAL AI" className="h-8" />
            <span className="font-bold">RIOH DIGITAL A.I HUB</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Button asChild variant="outline">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={signOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                  Bem-vindo ao RIOH DIGITAL A.I HUB
                </h1>
                {user ? (
                  <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                    Você está logado. Acesse seus assistentes de IA e transforme sua maneira de trabalhar.
                  </p>
                ) : (
                  <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                    Acesse nossos assistentes de IA e transforme sua maneira de trabalhar.
                  </p>
                )}
              </div>
              <div className="space-x-4">
                {user ? (
                  <Button asChild size="lg">
                    <Link to="/dashboard">Acessar Assistentes</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild size="lg">
                      <Link to="/register">Comece agora</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link to="/login">Já tem uma conta?</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
        <section className="py-12 md:py-24 lg:py-32 bg-secondary">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                    Resultados Esportivos Oficiais
                  </h2>
                  <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                    Obtenha os resultados mais atualizados de partidas esportivas em tempo real.
                    Acompanhe ligas, campeonatos e atletas com informações precisas e confiáveis.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  {user ? (
                    <Button asChild>
                      <Link to="/dashboard">Acessar assistente</Link>
                    </Button>
                  ) : (
                    <Button asChild>
                      <Link to="/register">Experimente agora</Link>
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="bg-primary/10 aspect-video overflow-hidden rounded-lg border p-8">
                  <div className="text-6xl text-center">🏆</div>
                  <div className="mt-4 text-center text-lg font-semibold">Resultados em tempo real</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-center gap-4 md:h-16 md:flex-row px-4">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            &copy; {new Date().getFullYear()} RIOH DIGITAL AI SOLUTIONS. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
