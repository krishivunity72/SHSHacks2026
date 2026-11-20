export async function readSketch(photo: File) {
  const form = new FormData();
  form.append('file', photo);

  let response: Response;
  try {
    response = await fetch('/api/processImage', { method: 'POST', body: form });
  } catch {
    throw new Error("Couldn't reach the backend. Is the Python server running?");
  }

  if (!response.ok) {
    throw new Error(`The backend had a problem reading the sketch (error ${response.status}). Try again or use a clearer photo.`);
  }
  return response.json();
}
