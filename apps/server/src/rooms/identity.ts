// Who is on the other end of a connection; lives in the domain so rooms never import from the transport layer.
export interface ConnectionIdentity { roomId: string; participantId: string; }
