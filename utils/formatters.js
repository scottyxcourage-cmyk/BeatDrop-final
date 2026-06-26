const formatUserResponse = (user, { includeAvatar = true } = {}) => {
  const obj = { id: user.id, username: user.username, email: user.email, role: user.role };
  if (includeAvatar) obj.avatar = user.avatar;
  return obj;
};

module.exports = { formatUserResponse };
