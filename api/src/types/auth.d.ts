export interface IuserTokenType {
  userId: number;
  userName: string;
  empId?: string;
  session: string;
  exp: number;
  iat: number;
}
