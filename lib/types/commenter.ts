export type CommenterProfile = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  username: string;
};

export type CommenterWithStats = CommenterProfile & {
  totalCount: number;
  deletedCount: number;
  spamCount: number;
  isBanned: boolean;
};
