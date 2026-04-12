import { db } from "./prisma";
import { getCurrentUser } from "./auth";

export const syncUser = async (query = {}) => getCurrentUser(query);

export const getCurrentDbUser = async (query = {}) => getCurrentUser(query);

export const getUserById = async (id, query = {}) => {
  if (!id) {
    return null;
  }

  return db.user.findUnique({
    where: { id },
    ...query,
  });
};

export const getUserByClerkId = async (_legacyClerkUserId, query = {}) =>
  getCurrentUser(query);

export const checkUser = syncUser;
