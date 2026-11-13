export interface User {
    id: string;
    username: string;
    email: string;
    password_hash: string;
    created_at: string;
}
export interface CreateUserInput {
    username: string;
    email: string;
    password_hash: string;
}
export interface UpdateUserInput {
    username?: string;
    email?: string;
}
export declare const getUserById: (id: string) => Promise<User | null>;
export declare const getUserByUsername: (username: string) => Promise<User | null>;
export declare const getUserByEmail: (email: string) => Promise<User | null>;
export declare const createUser: (userData: CreateUserInput) => Promise<User>;
export declare const updateUser: (id: string, userData: UpdateUserInput) => Promise<User | null>;
export declare const deleteUser: (id: string) => Promise<boolean>;
//# sourceMappingURL=userService.d.ts.map