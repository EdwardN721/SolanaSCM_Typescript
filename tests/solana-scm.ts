import * as anchor from "@coral-xyz/anchor"; // Importa el framework Anchor para desarrollo en Solana
import { Program } from "@coral-xyz/anchor"; // Importa tipos de programa de Anchor
import { RegistryProject, Registry } from "../target/types/registry_project"; // Importa los tipos generados del programa
import { assert } from "chai"; // Importa Chai para hacer aserciones en las pruebas
import { SystemProgram } from "@solana/web3.js";


// Describe el conjunto de pruebas para el proyecto
describe("my-project", () => {
  // Configuración del proveedor de Anchor para establecer el contexto de conexión con la red
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Genera cuentas para el registro y el dispositivo que serán usadas en las pruebas
  let registryAccount = anchor.web3.Keypair.generate();
  let deviceAccount = anchor.web3.Keypair.generate();

  // Obtiene una referencia al programa desplegado usando el workspace de Anchor
  const program = anchor.workspace.RegistryProject as Program<RegistryProject>;

  // Define los valores de prueba
  const registryName = "Registro 1";
  const deviceName = "Sensor";
  const deviceDescription = "Sensor de Oficina";
  const deviceMetadata = [["marca", "Solana"], ["modelo", "2024"]];
  const deviceData = [["estado", "activo"], ["bateria", "80%"]];
  
  console.log("Provider: " , provider);
  console.log("RegistryAccount: " , registryAccount);
  console.log("deviceAccount: " , deviceAccount);
  console.log("program: " , program);
  console.log("Nombre registro: " , registryName);
  console.log("Nombre dispositivo: " , deviceName);
  console.log("Descripcion: " , deviceDescription);
  console.log("Metadata: " , deviceMetadata);
  console.log("Data: " , deviceData);



  // Prueba para crear un registro y agregar un dispositivo
  it("Registrando", async () => {
    try {
      // Crea un nuevo registro
      await program.methods
        .createRegistry(registryName) // Llama al método de creación de registro con el nombre especificado
        .accounts({
          registry: registryAccount.publicKey, // La cuenta del registro
          user: provider.wallet.publicKey, // Cuenta del usuario que crea el registro
          system_program: anchor.web3.SystemProgram.programId
        })
        .signers([registryAccount]) // Especifica la cuenta de registro como firmante
        .rpc(); // Ejecuta la transacción en la red
    } catch (error: any) {
      // Maneja y muestra los errores de la transacción
      if (error.logs) {
        console.error("Transaction logs:", error.logs);
      } else {
        console.error("Error:", error);
      }
      throw error;
    }

    // Verifica que el registro fue creado correctamente
    const registryAccountData: Registry = await program.account.registry.fetch(registryAccount.publicKey);
    assert.equal(registryAccountData.name, registryName, "El nombre del registro no coincide.");
    assert.equal(registryAccountData.deviceCount.toNumber(), 0, "El contador de dispositivos no es cero.");
    assert.equal(registryAccountData.ownerId.toString(), provider.wallet.publicKey.toString(), "El propietario del registro no coincide.");

    // Añade un dispositivo al registro creado
    try {
      await program.methods
        .addDevice(deviceName, deviceDescription, deviceMetadata, deviceData) // Llama al método para añadir el dispositivo
        .accounts({
          registry: registryAccount.publicKey, // La cuenta del registro al que se añadirá el dispositivo
          device: deviceAccount.publicKey, // La cuenta del nuevo dispositivo
          user: provider.wallet.publicKey, // Cuenta del usuario que añade el dispositivo
          system_program: anchor.web3.SystemProgram.programId, // Identificador del programa de sistema
        })
        .signers([deviceAccount]) // Especifica la cuenta del dispositivo como firmante
        .rpc(); // Ejecuta la transacción en la red
    } catch (error: any) {
      // Maneja y muestra los errores de la transacción
      if (error.logs) {
        console.error("Transaction logs:", error.logs);
      } else {
        console.error("Error:", error);
      }
      throw error;
    }

    // Verifica que el dispositivo fue añadido al registro correctamente
    const updatedRegistryAccountData: Registry = await program.account.registry.fetch(registryAccount.publicKey);
    assert.equal(updatedRegistryAccountData.deviceCount.toNumber(), 1, "El contador de dispositivos no es uno.");

    // Busca el dispositivo recién añadido dentro del registro
    const device = updatedRegistryAccountData.devices.find(([name]) => name === deviceName)?.[1];

    // Asegura que el dispositivo existe y tiene los datos correctos
    assert.isDefined(device, "El dispositivo no fue encontrado en el registro.");
    assert.equal(device.name, deviceName, "El nombre del dispositivo no coincide.");
    assert.equal(device.description, deviceDescription, "La descripción del dispositivo no coincide.");
    assert.deepEqual(device.metadata, deviceMetadata, "La metadata del dispositivo no coincide.");
    assert.deepEqual(device.data, deviceData, "Los datos del dispositivo no coinciden.");
  });
});
