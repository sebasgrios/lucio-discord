interface DisposableConnection {
  destroy(): void;
}

export async function resolveWhileConnecting<T, C extends DisposableConnection>(
  resolution: Promise<T>,
  connection: Promise<C>,
): Promise<{ resolved: T; connection: C }> {
  const [resolutionResult, connectionResult] = await Promise.allSettled([resolution, connection]);
  if (resolutionResult.status === 'rejected') {
    if (connectionResult.status === 'fulfilled') connectionResult.value.destroy();
    throw resolutionResult.reason;
  }
  if (connectionResult.status === 'rejected') throw connectionResult.reason;
  return { resolved: resolutionResult.value, connection: connectionResult.value };
}
