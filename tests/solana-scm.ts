import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RegistryProject, Registry } from "../target/types/registry_project";
import { assert } from "chai";

describe("my-project", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  let registryAccount = anchor.web3.Keypair.generate();
  let deviceAccount = anchor.web3.Keypair.generate();

  const program = anchor.workspace.RegistryProject as Program<RegistryProject>;

  const registryName = "Registro 1";
  const deviceName = "Sensor";
  const deviceDescription = "Sensor de Oficina";
  const deviceMetadata = [["marca", "Solana"], ["modelo", "2024"]];
  const deviceData = [["estado", "activo"], ["bateria", "80%"]];

  it("Registrando", async () => {
    try {
      // Crea el registro
      await program.methods
        .createRegistry(registryName)
        .accounts({
          registry: registryAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([registryAccount])
        .rpc();
    } catch (error: any) {
      if (error.logs) {
        console.error("Transaction logs:", error.logs);
      } else {
        console.error("Error:", error);
      }
      throw error;
    }

    // Verifica los datos del registro
    const registryAccountData: Registry = await program.account.registry.fetch(registryAccount.publicKey);
    assert.equal(registryAccountData.name, registryName);
    assert.equal(registryAccountData.deviceCount.toNumber(), 0);
    assert.equal(registryAccountData.ownerId.toString(), provider.wallet.publicKey.toString());

    // Ahora añade un dispositivo al registro
    try {
      await program.methods
        .addDevice(deviceName, deviceDescription, deviceMetadata, deviceData)
        .accounts({
          registry: registryAccount.publicKey,
          device: deviceAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([deviceAccount])
        .rpc();
    } catch (error: any) {
      if (error.logs) {
        console.error("Transaction logs:", error.logs);
      } else {
        console.error("Error:", error);
      }
      throw error;
    }

    // Verifica que el dispositivo fue añadido correctamente
    const updatedRegistryAccountData: Registry = await program.account.registry.fetch(registryAccount.publicKey);
    assert.equal(updatedRegistryAccountData.deviceCount.toNumber(), 1);
    const device = updatedRegistryAccountData.devices.find(([name]) => name === deviceName)?.[1];

    assert.isDefined(device, "El dispositivo no fue encontrado en el registro.");
    assert.equal(device.name, deviceName);
    assert.equal(device.description, deviceDescription);
    assert.deepEqual(device.metadata, deviceMetadata);
    assert.deepEqual(device.data, deviceData);
  });
});
