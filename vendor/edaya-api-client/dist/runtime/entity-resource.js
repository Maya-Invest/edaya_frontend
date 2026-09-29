import { unwrapEntity, unwrapEntityList } from './entity-envelope';
import { schoolApiPath } from './paths';
export class EntityResource {
    transport;
    publicName;
    operations;
    constructor(transport, publicName, operations) {
        this.transport = transport;
        this.publicName = publicName;
        this.operations = operations;
    }
    async list(query = {}) {
        const result = await this.transport.request('POST', this.path('list'), { body: query });
        return unwrapEntityList(result);
    }
    async one(query) {
        const result = await this.transport.request('POST', this.path('one'), { body: query });
        return unwrapEntity(result);
    }
    count(query = {}) {
        return this.transport.request('POST', this.path('count'), { body: query });
    }
    async get(id) {
        const result = await this.transport.request('GET', schoolApiPath('entities', this.publicName, id));
        return unwrapEntity(result);
    }
    async save(entity) {
        this.requireOperation(this.operations.create && this.operations.update);
        const result = await this.transport.request('POST', this.path('save'), { body: entity });
        return unwrapEntity(result);
    }
    delete(input) {
        this.requireOperation(this.operations.delete);
        return this.transport.request('POST', this.path('delete'), { body: input });
    }
    batchSave(input) {
        this.requireOperation(this.operations.batchCreate && this.operations.batchUpdate);
        return this.transport.request('POST', this.path('batch-save'), { body: input });
    }
    batchDelete(input) {
        this.requireOperation(this.operations.batchDelete);
        return this.transport.request('POST', this.path('batch-delete'), { body: input });
    }
    requireOperation(allowed) {
        if (!allowed)
            throw new Error(`Generic mutation is unavailable for ${this.publicName}; use a domain command`);
    }
    path(action) {
        return schoolApiPath('entities', this.publicName, action);
    }
}
