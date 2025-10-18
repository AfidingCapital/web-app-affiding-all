/** Self Service User model. */
export interface User {
  id: number;
  username: string;
  email: string;
  isSelfServiceUser: boolean;
  officeName: string;
  staffDisplayName: string;
}
