export const Env = {
    get: (key, defaultValue = undefined) => {
      return process.env[key] || defaultValue;
    },
  };
  