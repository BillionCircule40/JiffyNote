export interface PlanEventRecord {
    id: string;
    title: string;
    dayOfWeek: number;
    daysOfWeek?: number[];
    startTime: string;
    endTime: string;
    color: string;
    noteIds?: string[];
}
export interface PlanRecord {
    id: string;
    title: string;
    description: string;
    color: string;
    events: PlanEventRecord[];
    recurrence?: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
}
export declare const getPlansByUserId: (userId: string) => Promise<PlanRecord[]>;
export declare const replacePlansForUser: (userId: string, plans: PlanRecord[]) => Promise<PlanRecord[]>;
//# sourceMappingURL=planService.d.ts.map