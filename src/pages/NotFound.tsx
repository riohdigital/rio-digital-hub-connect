
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="space-y-6 max-w-md">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">404 - Página não encontrada</h1>
          <p className="text-gray-500 md:text-xl dark:text-gray-400">
            A página que você está procurando não existe ou foi movida.
          </p>
        </div>
        <div className="flex justify-center">
          <Button asChild>
            <Link to="/">Voltar para a página inicial</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
