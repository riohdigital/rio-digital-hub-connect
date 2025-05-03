
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getAllUserProfiles, updateUserProfile, Profile, isUserAdmin, getAvailableAssistants, Assistant } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Edit, Plus, Users, RefreshCcw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

// Componente para a tabela de usuários
const UsersTable = ({ 
  filteredProfiles,
  isLoading,
  handleEditUser,
  assistants
}) => (
  <div className="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Plano</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>WhatsApp</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredProfiles.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
              {isLoading ? 'Carregando...' : 'Nenhum usuário encontrado.'}
            </TableCell>
          </TableRow>
        ) : (
          filteredProfiles.map((profile) => (
            <TableRow key={profile.id}>
              <TableCell className="font-mono text-xs">
                {profile.id.substring(0, 8)}...
              </TableCell>
              <TableCell>
                {profile.full_name || 'Não definido'}
              </TableCell>
              <TableCell>{profile.google_email || 'N/A'}</TableCell>
              <TableCell>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                  ${profile.plan === 'pro' ? 'bg-blue-100 text-blue-800' : 
                    profile.plan === 'premium' ? 'bg-purple-100 text-purple-800' : 
                    'bg-gray-100 text-gray-800'}`}>
                  {profile.plan || 'free'}
                </span>
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                  ${profile.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  {profile.role || 'basic_user'}
                </span>
              </TableCell>
              <TableCell>
                {profile.whatsapp_jid ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    Conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                    Não conectado
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => handleEditUser(profile)}>
                  <Edit size={16} />
                  <span className="sr-only">Editar</span>
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
);

// Componente para o modal de edição de usuário
const EditUserDialog = ({
  open,
  onOpenChange,
  currentProfile,
  editFullName,
  setEditFullName,
  editPlan,
  setEditPlan,
  editRole,
  setEditRole,
  assistantsAccess,
  setAssistantsAccess,
  availableAssistants,
  handleSaveEdit
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Editar Usuário</DialogTitle>
        <DialogDescription>
          Atualize as informações do usuário. Clique em salvar quando terminar.
        </DialogDescription>
      </DialogHeader>
      
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="name" className="text-right text-sm font-medium">
            Nome
          </label>
          <Input
            id="name"
            value={editFullName}
            onChange={(e) => setEditFullName(e.target.value)}
            className="col-span-3"
          />
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="plan" className="text-right text-sm font-medium">
            Plano
          </label>
          <Select value={editPlan} onValueChange={setEditPlan}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Selecione um plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="role" className="text-right text-sm font-medium">
            Role
          </label>
          <Select value={editRole} onValueChange={setEditRole}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Selecione uma role" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="basic_user">Usuário Básico</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-4 items-start gap-4">
          <label className="text-right text-sm font-medium pt-1">
            Assistentes
          </label>
          <div className="col-span-3 flex flex-col space-y-2">
            {availableAssistants.map(assistant => (
              <div key={assistant.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`assistant-${assistant.id}`}
                  checked={assistantsAccess.includes(assistant.type)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setAssistantsAccess(prev => [...prev, assistant.type]);
                    } else {
                      setAssistantsAccess(prev => 
                        prev.filter(type => type !== assistant.type)
                      );
                    }
                  }}
                />
                <label 
                  htmlFor={`assistant-${assistant.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {assistant.icon} {assistant.name}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// Componente para o modal de convite de usuário
const InviteUserDialog = ({
  open,
  onOpenChange,
  inviteEmail,
  setInviteEmail,
  handleInviteUser
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Convidar Novo Usuário</DialogTitle>
        <DialogDescription>
          Envie um email de convite para que um novo usuário se junte à plataforma.
        </DialogDescription>
      </DialogHeader>
      
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="email" className="text-right text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="usuario@exemplo.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="col-span-3"
          />
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={handleInviteUser}>Enviar Convite</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableAssistants, setAvailableAssistants] = useState<Assistant[]>([]);

  // Estado para os modais
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');

  // Estados para edição de perfil
  const [editFullName, setEditFullName] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [editRole, setEditRole] = useState('');
  const [assistantsAccess, setAssistantsAccess] = useState<string[]>([]);

  // Verificar se o usuário é administrador
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!loading && user) {
        try {
          console.log("[AdminDashboard] Checking admin status for user:", user.id);
          const adminStatus = await isUserAdmin(user.id);
          console.log("[AdminDashboard] Admin status:", adminStatus);
          setIsAdmin(adminStatus);
          
          if (!adminStatus) {
            toast({
              title: "Acesso Negado",
              description: "Você não tem permissão para acessar esta página.",
              variant: "destructive",
            });
            navigate('/dashboard');
          } else {
            await loadProfiles();
            await loadAssistants();
          }
        } catch (error) {
          console.error('Erro ao verificar status de administrador:', error);
          setIsAdmin(false);
          navigate('/dashboard');
        }
      } else if (!loading && !user) {
        navigate('/login');
      }
    };

    checkAdminAccess();
  }, [user, loading, navigate]);

  // Carregar os assistentes disponíveis
  const loadAssistants = async () => {
    try {
      const assistants = await getAvailableAssistants();
      setAvailableAssistants(assistants);
    } catch (error) {
      console.error('Erro ao carregar assistentes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os assistentes.",
        variant: "destructive",
      });
    }
  };

  // Carregar os perfis de usuários
  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      console.log("[AdminDashboard] Loading all user profiles");
      const data = await getAllUserProfiles();
      console.log("[AdminDashboard] Profiles loaded:", data.length);
      setProfiles(data);
      setFilteredProfiles(data);
    } catch (error) {
      console.error('Erro ao carregar perfis:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os perfis de usuários.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar perfis baseado no termo de busca
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProfiles(profiles);
    } else {
      const filtered = profiles.filter(profile => {
        const fullNameMatch = profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const emailMatch = profile.google_email?.toLowerCase().includes(searchTerm.toLowerCase());
        return fullNameMatch || emailMatch;
      });
      setFilteredProfiles(filtered);
    }
  }, [searchTerm, profiles]);

  // Função para abrir o modal de edição
  const handleEditUser = (profile: Profile) => {
    setCurrentProfile(profile);
    setEditFullName(profile.full_name || '');
    setEditPlan(profile.plan || 'free');
    setEditRole(profile.role || 'basic_user');
    
    // Obter assistentes do usuário a partir da tabela user_plans
    const userAssistantTypes = profile.plan?.split(',') || [];
    setAssistantsAccess(userAssistantTypes);
    
    setEditDialogOpen(true);
  };

  // Função para salvar as edições do perfil
  const handleSaveEdit = async () => {
    if (!currentProfile) return;
    
    try {
      // Salvar assistentes selecionados diretamente na tabela user_plans
      // Primeiro atualizamos o perfil
      const updatedProfile = await updateUserProfile(currentProfile.id, {
        full_name: editFullName,
        role: editRole,
        plan: editPlan,
      });
      
      console.log("Assistentes selecionados:", assistantsAccess);
      
      // Agora criamos ou atualizamos os planos do usuário com base nos assistentes selecionados
      await updateUserAssistants(currentProfile.id, assistantsAccess);
      
      // Atualizar a lista de perfis
      setProfiles(prevProfiles => 
        prevProfiles.map(p => p.id === currentProfile.id ? updatedProfile : p)
      );
      
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso.",
      });
      
      setEditDialogOpen(false);
      
      // Recarregar perfis após atualização
      await loadProfiles();
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    }
  };

  // Função para atualizar os assistentes de um usuário
  const updateUserAssistants = async (userId: string, assistantTypes: string[]) => {
    try {
      // Para cada tipo de assistente, criamos um registro em user_plans
      // Esta função simples vai adicionar todos os assistentes selecionados
      const { data: existingPlans, error: fetchError } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) {
        console.error("Erro ao buscar planos existentes:", fetchError);
        throw fetchError;
      }

      // Calcular quais planos precisam ser adicionados e quais removidos
      const existingTypes = existingPlans.map(plan => plan.plan_name);
      const typesToAdd = assistantTypes.filter(type => !existingTypes.includes(type));
      const typesToRemove = existingTypes.filter(type => !assistantTypes.includes(type) && type !== 'free');

      console.log("Planos existentes:", existingTypes);
      console.log("Planos para adicionar:", typesToAdd);
      console.log("Planos para remover:", typesToRemove);

      // Remover planos que não estão mais selecionados
      if (typesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_plans')
          .delete()
          .eq('user_id', userId)
          .in('plan_name', typesToRemove);

        if (deleteError) {
          console.error("Erro ao remover planos:", deleteError);
          throw deleteError;
        }
      }

      // Adicionar novos planos
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      for (const type of typesToAdd) {
        const { error: insertError } = await supabase
          .from('user_plans')
          .insert({
            user_id: userId,
            plan_name: type,
            expires_at: oneYearFromNow.toISOString()
          });

        if (insertError) {
          console.error(`Erro ao adicionar plano ${type}:`, insertError);
          throw insertError;
        }
      }

      // Garantir que o plano 'free' sempre exista
      if (!existingTypes.includes('free')) {
        await supabase
          .from('user_plans')
          .insert({
            user_id: userId,
            plan_name: 'free',
            expires_at: null
          });
      }

    } catch (error) {
      console.error('Erro ao atualizar assistentes do usuário:', error);
      throw error;
    }
  };

  // Função para convidar um novo usuário
  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um email válido.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Esta função deverá chamar uma Edge Function segura
      // Por enquanto, simulamos um sucesso para a demonstração
      toast({
        title: "Função não implementada",
        description: "Esta funcionalidade requer uma Edge Function segura com service_role_key.",
      });
      
      setInviteEmail('');
      setInviteDialogOpen(false);
    } catch (error) {
      console.error('Erro ao convidar usuário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o convite.",
        variant: "destructive",
      });
    }
  };

  // Se estiver carregando ou verificando permissões de admin
  if (isLoading || isAdmin === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="ml-2 text-muted-foreground">Verificando permissões...</span>
      </div>
    );
  }

  // Se não for um admin, a navegação já deve ter redirecionado
  return (
    <div className="container py-8">
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">Painel de Administração</CardTitle>
              <CardDescription>Gerencie usuários, acessos e planos</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={loadProfiles} className="flex items-center">
                <RefreshCcw size={16} className="mr-1" /> Atualizar
              </Button>
              <Button onClick={() => setInviteDialogOpen(true)} className="flex items-center">
                <Plus size={16} className="mr-1" /> Convidar Usuário
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users size={20} className="mr-2" /> Gerenciamento de Usuários
          </CardTitle>
          <div className="mt-2 flex items-center w-full max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nome ou email..."
                className="w-full pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UsersTable 
            filteredProfiles={filteredProfiles}
            isLoading={isLoading}
            handleEditUser={handleEditUser}
            assistants={availableAssistants}
          />
        </CardContent>
      </Card>

      {/* Modais */}
      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        currentProfile={currentProfile}
        editFullName={editFullName}
        setEditFullName={setEditFullName}
        editPlan={editPlan}
        setEditPlan={setEditPlan}
        editRole={editRole}
        setEditRole={setEditRole}
        assistantsAccess={assistantsAccess}
        setAssistantsAccess={setAssistantsAccess}
        availableAssistants={availableAssistants}
        handleSaveEdit={handleSaveEdit}
      />

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
        handleInviteUser={handleInviteUser}
      />
    </div>
  );
};

export default AdminDashboard;
