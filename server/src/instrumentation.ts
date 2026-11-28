import { useAzureMonitor } from '@azure/monitor-opentelemetry';
import { DefaultAzureCredential } from '@azure/identity';

const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
if (connectionString) {
  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString,
      credential: new DefaultAzureCredential(),
    },
  });
}
