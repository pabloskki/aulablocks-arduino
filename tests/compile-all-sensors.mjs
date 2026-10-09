import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as BlocklyModule from 'blockly/core';
import 'blockly/blocks';
import { registerArduinoBlocks, CATEGORY_COLOURS } from '../src/blocks.js';
import { generateSketch, registerExtensionGenerators } from '../src/generator.js';
import arduinoServiceModule from '../electron/arduino-service.cjs';

const Blockly = BlocklyModule.Workspace ? BlocklyModule : BlocklyModule.default;
const { createArduinoService } = arduinoServiceModule;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimeRoot = path.resolve(process.argv[2] || path.join(root, 'tools', 'arduino-cli'));
const writableRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aulablocks-sensor-test-'));
const service = createArduinoService({ runtimeRoot, writableRoot, platform: process.platform, bundleVersion: 'test' });
const catalog = JSON.parse(await fs.readFile(path.join(root, 'sensor-catalog.json'), 'utf8'));
const results = [];

registerArduinoBlocks();
try {
  for (const entry of catalog.sensors) {
    const extension = JSON.parse(await fs.readFile(path.join(root, ...entry.file.split('/')), 'utf8'));
    await service.installSensorPackage(extension);
    const definitions = extension.blocks.map((block) => ({
      ...block,
      colour: block.colour || extension.colour || CATEGORY_COLOURS.extensions,
      previousStatement: block.codeKind === 'expression' || block.output != null ? undefined : null,
      nextStatement: block.codeKind === 'expression' || block.output != null ? undefined : null,
      output: block.codeKind === 'expression' && block.output == null ? null : block.output
    }));
    Blockly.defineBlocksWithJsonArray(definitions);
    registerExtensionGenerators(extension);
    const workspace = new Blockly.Workspace();
    workspace.newBlock('arduino_setup');
    const loop = workspace.newBlock('arduino_loop');
    let previous = null;
    for (const definition of definitions) {
      const sensorBlock = workspace.newBlock(definition.type);
      let statement = sensorBlock;
      if (sensorBlock.outputConnection) {
        const print = workspace.newBlock('serial_print');
        print.getInput('VALUE').connection.connect(sensorBlock.outputConnection);
        statement = print;
      }
      if (!statement.previousConnection) throw new Error(`${definition.type}: no se pudo crear la prueba`);
      if (!previous) loop.getInput('DO').connection.connect(statement.previousConnection);
      else previous.nextConnection.connect(statement.previousConnection);
      previous = statement;
    }
    const code = generateSketch(workspace, [extension]);
    for (const board of ['uno', 'nano']) {
      await service.buildAndMaybeUpload({ upload: false, board, projectName: `test_${extension.id}_${board}`, code });
      results.push(`${extension.name} ${extension.version} · ${board}: OK`);
    }
    workspace.dispose();
  }
  console.log(results.join('\n'));
  console.log(`\n${results.length} compilaciones correctas.`);
} finally {
  await fs.rm(writableRoot, { recursive: true, force: true });
}
