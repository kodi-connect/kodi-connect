/* @flow */

export function wrapAsync(handler: Function) {
  return (req: Object, res: Object) => {
    const p = handler(req, res);

    let timedOut = false;

    const timerId = setTimeout(() => {
      timedOut = true;
      res.status(500).json({ error: 'Timed out' });
    }, 30000);

    p.then(
      () => {
        if (timedOut) return;
        clearTimeout(timerId);
      },
      (error) => {
        console.error(error);
        if (timedOut) return;
        clearTimeout(timerId);
        res.status(500).json({ error: error.message });
      },
    );
  };
}

export function wrapAsyncMiddleware(handler: Function) {
  return (req: Object, res: Object, next: Function) => {
    const p = handler(req, res, next);

    let timedOut = false;

    // TODO - wrap next function to track that next was called
    const timerId = setTimeout(() => {
      timedOut = true;
      res.status(500).json({ error: 'Timed out' });
    }, 30000);

    p.then(
      () => {
        if (timedOut) return;
        clearTimeout(timerId);
      },
      (error) => {
        console.error(error);
        if (timedOut) return;
        clearTimeout(timerId);
        res.status(500).json({ error: error.message });
      },
    );
  };
}
