import type { InferenceWorkerRequest, InferenceWorkerResponse } from "@vault/shared";

export class FakeInferenceWorker {
  async execute(input: {
    request: InferenceWorkerRequest;
    memoryBudgetBytes: number;
  }): Promise<InferenceWorkerResponse> {
    const { request, memoryBudgetBytes } = input;
    if (request.operation === "probe") {
      return {
        protocolVersion: 1,
        requestId: request.requestId,
        status: "ok",
        operation: "probe",
        networkDenied: true,
        credentialEnvironmentAbsent: true,
        shellEnvironmentAbsent: true,
        workspaceDenied: true,
        outOfScopeReadDenied: true,
        outOfScopeWriteDenied: true,
        executableToolsDenied: true,
        nodeReexecDenied: true,
      };
    }
    const memory = { cpuRamBytes: 1024, gpuVramBytes: 2048, budgetBytes: memoryBudgetBytes };
    if (request.operation === "embed") {
      return {
        protocolVersion: 1,
        requestId: request.requestId,
        status: "ok",
        operation: "embed",
        vector: [request.input.length, 1],
        memory,
      };
    }
    return {
      protocolVersion: 1,
      requestId: request.requestId,
      status: "ok",
      operation: "generate",
      value: { result: request.prompt },
      memory,
    };
  }
}
