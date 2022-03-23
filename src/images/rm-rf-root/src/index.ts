import * as express from "express";
import { spawnSync } from "child_process";

const app = express();

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.get("/", async (req: express.Request, res: express.Response) => {
  console.log("get /");
  res.status(200).json({ message: "rm -rf API" });
});

app.post("/", async (req: express.Request, res: express.Response) => {
  console.log("post /");

  console.log(req.body);
  const dir = req.body.dir;

  // Run "ls -l" before "rm -rf
  const cmd_before_ls_l_dir = spawnSync(`ls -l ${dir}`, { shell: true });
  console.log(`before ls -l ${dir} : ${cmd_before_ls_l_dir.stdout.toString()}`);

  // Run "rm -rf"
  const cmd_rm_rf_dir = spawnSync(`rm -rf ${dir}`, { shell: true });
  console.log(`rm -rf ${dir} stdout: ${cmd_rm_rf_dir.stdout.toString()}`);
  console.log(`rm -rf ${dir} stderr: ${cmd_rm_rf_dir.stderr.toString()}`);

  // Run "ls -l" after "rm -rf
  const cmd_after_ls_l_dir = spawnSync(`ls -l ${dir}`, { shell: true });
  console.log(`before ls -l ${dir} : ${cmd_after_ls_l_dir.stdout.toString()}`);

  res.status(200).json({
    cmd_before_ls_l_dir: `${cmd_before_ls_l_dir.stdout.toString()}`,
    cmd_after_ls_l_dir: `${cmd_after_ls_l_dir.stdout.toString()}`,
  });
});

app.listen(80, () => {
  console.log("Example app listening on port 80!");

  const cmd_pwd = spawnSync("pwd", { shell: true }).stdout.toString();
  const cmd_ls_l = spawnSync("ls -l", { shell: true }).stdout.toString();

  console.log(`
    pwd : ${cmd_pwd}
    ls -l : ${cmd_ls_l}
  `);
});
