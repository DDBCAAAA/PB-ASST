exports.healthCheck = (_req, res) => {
  res.status(200).json({ status: 'healthy' });
};
