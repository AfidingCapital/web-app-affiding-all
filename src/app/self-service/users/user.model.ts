export interface User {
  id: number;
  username: string;
  firstname?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  email?: string;
  mobile?: string;
  office?: string;
  staff?: { displayName?: string; joiningDate?: string; isActive?: boolean };
  // Propriétés utilitaires parfois présentes après normalisation
  isActive?: boolean;
}