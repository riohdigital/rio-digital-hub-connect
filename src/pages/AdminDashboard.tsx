
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getAllUserProfiles, updateUserProfile, Profile, isUserAdmin } from '@/lib/supabase';
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
import { Search, Edit, Plus, Users } from 'lucide-react';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para os modais
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');

  // Estados para edição de perfil
  const [editFullName, setEditFullName] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editAgentAccess, setEditAgentAccess] = useState(false);

  // Verificar se o usuário é administrador
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!loading && user) {
        try {
          const adminStatus = await isUserAdmin(user.id);
          setIsAdmin(adminStatus);
          
          if (!adminStatus) {
            toast({
              title: "Acesso Negado",
              description: "Você não tem permissão para acessar esta página.",
              variant: "destructive",
            });
            navigate('/dashboard');
          } else {
            loadProfiles();
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

  // Carregar os perfis de usuários
  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      const data = await getAllUserProfiles();
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
    setEditAgentAccess(profile.agent_access || false);
    setEditDialogOpen(true);
  };

  // Função para salvar as edições do perfil
  const handleSaveEdit = async () => {
    if (!currentProfile) return;
    
    try {
      const updatedProfile = await updateUserProfile(currentProfile.id, {
        full_name: editFullName,
        plan: editPlan,
        role: editRole,
        agent_access: editAgentAccess,
      });
      
      // Atualizar a lista de perfis
      setProfiles(prevProfiles => 
        prevProfiles.map(p => p.id === currentProfile.id ? updatedProfile : p)
      );
      
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso.",
      });
      
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    }
  };

  // Função para alternar o acesso de agente diretamente na tabela
  const toggleAgentAccess = async (profile: Profile) => {
    try {
      const updatedProfile = await updateUserProfile(profile.id, {
        agent_access: !profile.agent_access
      });
      
      // Atualizar a lista de perfis
      setProfiles(prevProfiles => 
        prevProfiles.map(p => p.id === profile.id ? updatedProfile : p)
      );
      
      toast({
        title: "Sucesso",
        description: `Acesso de agente ${updatedProfile.agent_access ? 'ativado' : 'desativado'} para ${profile.full_name}.`,
      });
    } catch (error) {
      console.error('Erro ao alternar acesso de agente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o acesso de agente.",
        variant: "destructive",
      });
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
            <Button onClick={() => setInviteDialogOpen(true)} className="flex items-center">
              <Plus size={16} className="mr-1" /> Convidar Usuário
            </Button>
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
                  <TableHead>Acesso Agente</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
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
                        <Button
                          variant={profile.agent_access ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleAgentAccess(profile)}
                        >
                          {profile.agent_access ? 'Ativo' : 'Inativo'}
                        </Button>
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
        </CardContent>
      </Card>

      {/* Modal de Edição de Usuário */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
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
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="agent" className="text-right text-sm font-medium">
                Acesso Agente
              </label>
              <div className="col-span-3 flex items-center space-x-2">
                <Button
                  type="button"
                  variant={editAgentAccess ? "default" : "outline"}
                  onClick={() => setEditAgentAccess(true)}
                >
                  Ativo
                </Button>
                <Button
                  type="button"
                  variant={!editAgentAccess ? "default" : "outline"}
                  onClick={() => setEditAgentAccess(false)}
                >
                  Inativo
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Convite de Usuário */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
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
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInviteUser}>Enviar Convite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
