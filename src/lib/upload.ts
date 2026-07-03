export function uploadWithProgress(opts: {
  url: string;
  formData: FormData;
  onProgress: (fraction: number) => void;
  signal?: AbortSignal;
}): Promise<{ status: number; json: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", opts.url);

    let lastProgress = 0;

    if (opts.signal) {
      if (opts.signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      opts.signal.addEventListener("abort", () => xhr.abort());
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) {
        const fraction = event.loaded / event.total;
        lastProgress = Math.max(lastProgress, fraction);
        opts.onProgress(lastProgress);
      }
    });

    xhr.addEventListener("load", () => {
      let json: unknown = null;
      try {
        json = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        json = null;
      }
      resolve({ status: xhr.status, json });
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error"));
    });

    xhr.addEventListener("abort", () => {
      reject(new DOMException("Aborted", "AbortError"));
    });

    xhr.send(opts.formData);
  });
}
