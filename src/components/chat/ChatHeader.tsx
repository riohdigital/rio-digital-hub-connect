
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ChatHeaderProps {
  icon?: string;
  name?: string;
  gifUrl?: string;
}

export const ChatHeader = ({ icon, name, gifUrl }: ChatHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Get user's full name or default to email if not available
  const userName = user?.user_metadata?.full_name || user?.email || "Usuário";

  return (
    <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          {icon && <div className="text-2xl sm:text-3xl shrink-0">{icon}</div>}
          <div className="space-y-0.5">
            <h1 className="text-lg sm:text-xl font-semibold break-words">
              {name || "Carregando Assistente..."}
            </h1>
            <p className="text-xs text-muted-foreground">
              Agente: {userName}
            </p>
          </div>
        </div>
      </div>
      
      {gifUrl ? (
        <div className="hidden sm:flex h-14 w-40 items-center justify-center overflow-hidden shrink-0">
          <img 
            src={gifUrl} 
            alt="Animation" 
            className="h-full w-auto object-contain"
          />
        </div>
      ) : (
        <div className="hidden sm:flex h-12 w-32 bg-muted rounded-md items-center justify-center">
          <span className="text-sm text-muted-foreground">ANIMAÇÃO SOCCER</span>
        </div>
      )}
    </header>
  );
};
