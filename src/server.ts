import { createApp } from './app';

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Sample File Access Service running on http://localhost:${PORT}`);
});