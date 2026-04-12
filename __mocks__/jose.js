// Mock jose library for Jest tests
module.exports = {
  jwtVerify: jest.fn().mockResolvedValue({
    payload: {
      sub: "test-user-id",
      email: "test@example.com",
    },
  }),
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue("mocked.jwt.token"),
  })),
  jwtDecode: jest.fn().mockReturnValue({
    sub: "test-user-id",
    email: "test@example.com",
  }),
};
