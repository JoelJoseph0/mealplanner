const keyFor = (userId) => `onboarded:${userId}`;

export const isOnboarded = (userId) => {
  try {
    return localStorage.getItem(keyFor(userId)) === '1';
  } catch {
    return true;
  }
};

export const markOnboarded = (userId) => {
  try {
    localStorage.setItem(keyFor(userId), '1');
  } catch {
    return;
  }
};
