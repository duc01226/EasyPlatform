export interface User {
    id: string;
    name: string;
    email: string;
}

export class UserService {
    private users: Map<string, User> = new Map();

    async getUser(id: string): Promise<User | undefined> {
        return this.users.get(id);
    }

    async createUser(user: User): Promise<void> {
        this.users.set(user.id, user);
    }

    async updateUser(id: string, updates: Partial<User>): Promise<boolean> {
        const user = this.users.get(id);
        if (!user) {
            return false;
        }

        this.users.set(id, { ...user, ...updates });
        return true;
    }

    async deleteUser(id: string): Promise<boolean> {
        return this.users.delete(id);
    }
}
