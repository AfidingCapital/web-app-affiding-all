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
isSelfServiceUser?: boolean;
isActive?: boolean;
}

