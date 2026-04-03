require('dotenv').config();

process.env.NODE_ENV = 'test';

if (process.env.DATABASE_URL_TEST) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'log').mockImplementation(() => { });
});

afterAll(() => {
    if (console.error.mockRestore) {
        console.error.mockRestore();
    }
    if (console.log.mockRestore) {
        console.log.mockRestore();
    }
});
