const jwt = require("jsonwebtoken");

const anyAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, 'supersecretkey');

    if (decoded.role !== "admin" && decoded.role !== "student") {
      return res.status(403).json({ error: "Invalid role" });
    }

    req.user = decoded; // contains { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = anyAuth;
