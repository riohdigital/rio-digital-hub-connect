
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ChatHeaderProps {
  icon?: string;
  name?: string;
  gifUrl?: string;
}

export const ChatHeader = ({ icon, name, gifUrl }: ChatHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {icon && <div className="text-3xl">{icon}</div>}
        <h1 className="text-xl font-semibold">
          {name || "Carregando Assistente..."}
        </h1>
      </div>
      
      {gifUrl ? (
        <div className="h-14 w-40 flex items-center justify-center overflow-hidden">
          <img 
            src={gifUrl} 
            alt="Animation" 
            className="h-full w-auto object-contain"
          />
        </div>
      ) : (
        <div className="h-12 w-32 bg-muted rounded-md flex items-center justify-center">
          <span className="text-sm text-muted-foreground">ANIMAÇÃO SOCCER</span>
        </div>
      )}
    </header>
  );
};
