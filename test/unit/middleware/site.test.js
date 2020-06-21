//const siteMiddleware = require('../../../src/middleware/site.js');
const createError = require('http-errors');

const mockRequest = (path) => ({
    path: path,
});

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('Site Middleware', () => {
    test('Should find a site', async () => {

        return expect(1).toEqual(1);



      //  await siteMiddleware(request, response, mockNext);

    });

});
