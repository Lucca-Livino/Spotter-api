process.env.NODE_ENV = 'test';

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
