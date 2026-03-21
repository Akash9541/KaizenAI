import { currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

export const syncUser = async () => {
  let user;

  try {
    user = await currentUser();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "Skipping user sync because Clerk middleware is unavailable for this request."
      );
    }
    return null;
  }

  if (!user) {
    return null;
  }

  try {
    const loggedInUser = await db.user.findUnique({
      where: {
        clerkUserId: user.id,
      },
    });

    if (loggedInUser) {
      return loggedInUser;
    }

    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

    const newUser = await db.user.create({
      data: {
        clerkUserId: user.id,
        name: name || user.username || user.emailAddresses[0].emailAddress,
        imageUrl: user.imageUrl,
        email: user.emailAddresses[0].emailAddress,
      },
    });

    return newUser;
  } catch (error) {
    console.log(error.message);
    return null;
  }
};

export const checkUser = syncUser;
