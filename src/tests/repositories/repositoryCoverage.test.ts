import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DatabaseError } from '../../utils/errors/DatabaseError';

// Helper para evitar TS2345
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockFn() {
  return jest.fn() as jest.MockedFunction<(...args: any[]) => any>;
}

// Mock do banco de dados
jest.mock('../../config/DbConnect', () => ({
    DataBase: {
        insert: mockFn().mockReturnThis(),
        select: mockFn().mockReturnThis(),
        update: mockFn().mockReturnThis(),
        delete: mockFn().mockReturnThis(),
        values: mockFn().mockReturnThis(),
        where: mockFn().mockReturnThis(),
        returning: mockFn().mockReturnThis(),
        limit: mockFn().mockReturnThis(),
        offset: mockFn().mockReturnThis(),
        from: mockFn().mockReturnThis(),
        innerJoin: mockFn().mockReturnThis(),
    },
    DbConnect: {
        connect: mockFn(),
        disconnect: mockFn(),
    }
}));

import { DataBase } from '../../config/DbConnect';
import AcademiaRepository from '../../repositories/academiaRepository';
import AlunoRepository from '../../repositories/alunoRepository';
import AparelhoRepository from '../../repositories/aparelhoRepository';
import ConversaRepository from '../../repositories/conversaRepository';
import MusculoRepository from '../../repositories/musculoRepository';

describe('Repository Catch Blocks Coverage', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('AcademiaRepository', () => {
        const repo = new AcademiaRepository();

        it('createAcademia handles error', async () => {
            (DataBase.insert as any).mockImplementationOnce(() => { throw new Error('db error'); });
            await expect(repo.createAcademia({} as any)).rejects.toThrow();
        });

        it('getAllAcademias handles error', async () => {
            (DataBase.select as any).mockImplementationOnce(() => { throw new Error('db error'); });
            await expect(repo.getAllAcademias(1, 10)).rejects.toThrow();
        });

        it('getAcademiaById handles error', async () => {
            (DataBase.select as any).mockImplementationOnce(() => { throw new Error('db error'); });
            await expect(repo.getAcademiaById('id')).rejects.toThrow();
        });

        it('updateAcademia handles error', async () => {
            (DataBase.update as any).mockImplementationOnce(() => ({
                set: () => ({
                    where: () => ({
                        returning: () => { throw new Error('db error'); }
                    })
                })
            }));
            await expect(repo.updateAcademia('id', {})).rejects.toThrow();
        });

        it('deleteAcademia handles non-Error throw', async () => {
            (DataBase.delete as any).mockImplementationOnce(() => { throw 'string error'; });
            await expect(repo.deleteAcademia('id')).rejects.toThrow();
        });
    });

    describe('AlunoRepository', () => {
        const repo = new AlunoRepository();
        it('catches generic error in getAllAlunos', async () => {
            (DataBase.select as any).mockImplementationOnce(() => { throw new Error('generic'); });
            await expect(repo.getAllAlunos(1, 10)).rejects.toThrow();
        });
        it('catches generic error in findById', async () => {
            (DataBase.select as any).mockImplementationOnce(() => { throw new Error('generic'); });
            await expect(repo.findById('id')).rejects.toThrow();
        });
    });

    describe('AparelhoRepository', () => {
        const repo = new AparelhoRepository();
        it('catches generic error in getAll', async () => {
            (DataBase.select as any).mockImplementationOnce(() => { throw new Error('generic'); });
            await expect(repo.getAll({} as any)).rejects.toThrow();
        });
        it('catches generic error in getById', async () => {
            (DataBase.select as any).mockImplementationOnce(() => { throw new Error('generic'); });
            await expect(repo.getById('id')).rejects.toThrow();
        });
    });

    describe('ConversaRepository', () => {
        const repo = new ConversaRepository();
        it('catches generic error in listByAlunoId', async () => {
            (DataBase.select as any).mockImplementationOnce(() => { throw new Error('generic'); });
            await expect(repo.listByAlunoId('u', 1, 10)).rejects.toThrow();
        });
    });

    describe('MusculoRepository', () => {
        const repo = new MusculoRepository();
        it('catches generic error in getAll', async () => {
            (DataBase.select as any).mockImplementationOnce(() => { throw new Error('generic'); });
            await expect(repo.getAll({} as any)).rejects.toThrow();
        });
    });
});
