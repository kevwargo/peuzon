import { DockerImage, Duration, IgnoreMode, Stack } from "aws-cdk-lib";
import { Code, Function, FunctionOptions, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import * as subprocess from "child_process";
import { Construct } from "constructs";
import path from "path";

export function createFunction(scope: Construct, handler: string, opts?: FuncOpts) {
  const func = new Function(scope, handler, {
    runtime,
    code: Code.fromAsset(srcDir, {
      exclude: [".venv", ".flake8", "scripts", "**/__pycache__/**", "**/*.pyc"],
      ignoreMode: IgnoreMode.GIT,
    }),
    handler: `peuzon.handlers.${handler}`,
    timeout: Duration.seconds(29),
    layers: [ensureLayer(scope)],
    ...opts,
  });

  if (opts?.with) {
    opts.with(func);
  }

  return func;
}

export interface FuncOpts extends FunctionOptions {
  with?: (f: Function) => void;
}

function ensureLayer(scope: Construct): LayerVersion {
  const stack = Stack.of(scope);
  const node = stack.node.tryFindChild(layerNodeId);
  if (node) {
    return node as LayerVersion;
  }

  let user: string | undefined;
  if (process.getuid && process.getgid) {
    user = `${process.getuid()}:${process.getgid()}`;
  }

  return new LayerVersion(stack, layerNodeId, {
    compatibleRuntimes: [runtime],
    code: Code.fromAsset(srcDir, {
      assetHash: subprocess
        .execSync(`${uvExportCmd} | md5sum`, {
          cwd: srcDir,
          encoding: "utf-8",
        })
        .trim(),
      bundling: {
        image: DockerImage.fromRegistry("ghcr.io/astral-sh/uv:python3.13-bookworm"),
        command: [
          "bash",
          "-c",
          [
            `${uvExportCmd} > ${assetReqs}`,
            `uv pip install --requirements ${assetReqs} --target /asset-output/python`,
          ].join(" && "),
        ],
        user,
        environment: {
          UV_CACHE_DIR: uvCacheMnt,
          UV_LINK_MODE: "copy",
        },
        volumes: [
          {
            hostPath: uvCacheHost,
            containerPath: uvCacheMnt,
          },
        ],
      },
    }),
  });
}

const runtime = Runtime.PYTHON_3_13;
const srcDir = path.resolve(`${__dirname}/../../src`);
const layerNodeId = "lambdaUvDepsLayer";
const uvExportCmd = "uv export --locked --no-dev --format requirements.txt";
const uvCacheHost = path.resolve(`${__dirname}/../../.uv-cache`);
const uvCacheMnt = "/uv-cache";
const assetReqs = "/asset-output/requirements.txt";
