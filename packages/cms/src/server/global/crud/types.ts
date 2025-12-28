export interface GlobalCRUD<
    TSelect = any,
    TInsert = any,
    TUpdate = any
> {
    get(options?: any, context?: any): Promise<TSelect | null>;
    update(data: TUpdate, context?: any): Promise<TSelect>;
    findVersions?: (options?: any, context?: any) => Promise<any[]>;
    revertToVersion?: (options: any, context?: any) => Promise<any>;
}
