import {
  Aws,
  Stack,
  StackProps,
  aws_ec2 as ec2,
  aws_ecr as ecr,
  aws_ecr_assets as ecr_assets,
  aws_ecs as ecs,
  aws_ecs_patterns as ecs_patterns,
  aws_apigateway as apigateway,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from "path";
import * as ecr_deploy from "cdk-ecr-deployment";

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, "Vpc", {
      cidr: "10.0.0.0/24",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 1,
      maxAzs: 2,
      subnetConfiguration: [
        { name: "Public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 27 },
        {
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
          cidrMask: 27,
        },
      ],
    });

    // ECR Repository
    const repository = new ecr.Repository(this, "Repository", {
      imageScanOnPush: true,
    });

    // Image
    const image = new ecr_assets.DockerImageAsset(this, "image", {
      directory: path.join(__dirname, "../src/images/rm-rf-root"),
    });

    // Deploy Image
    new ecr_deploy.ECRDeployment(this, "DeployImage", {
      src: new ecr_deploy.DockerImageName(image.imageUri),
      dest: new ecr_deploy.DockerImageName(
        `${Aws.ACCOUNT_ID}.dkr.ecr.${Aws.REGION}.amazonaws.com/${repository.repositoryName}`
      ),
    });

    // ECS Cluster
    const ecsCluster = new ecs.Cluster(this, "EcsCluster", {
      vpc,
      containerInsights: true,
    });

    // ECS Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "TaskDefinition"
    );

    taskDefinition
      .addContainer("rm-rf-rootContainer", {
        image: ecs.ContainerImage.fromEcrRepository(repository, "latest"),
        memoryLimitMiB: 256,
        logging: ecs.LogDriver.awsLogs({
          streamPrefix: repository.repositoryName,
        }),
      })
      .addPortMappings({
        protocol: ecs.Protocol.TCP,
        containerPort: 80,
        hostPort: 80,
      });

    // NLB
    const loadBalancedFargateService =
      new ecs_patterns.NetworkLoadBalancedFargateService(
        this,
        "LoadBalancedFargateService",
        {
          assignPublicIp: false,
          cluster: ecsCluster,
          taskSubnets: vpc.selectSubnets({
            subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
          }),
          memoryLimitMiB: 1024,
          cpu: 512,
          desiredCount: 2,
          taskDefinition: taskDefinition,
          publicLoadBalancer: true,
        }
      );

    loadBalancedFargateService.service.connections.allowFrom(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(80)
    );

    // Auto Scaling Settings
    const scalableTarget =
      loadBalancedFargateService.service.autoScaleTaskCount({
        minCapacity: 2,
        maxCapacity: 10,
      });

    scalableTarget.scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: 50,
    });

    scalableTarget.scaleOnMemoryUtilization("MemoryScaling", {
      targetUtilizationPercent: 50,
    });

    // VPC Link
    const link = new apigateway.VpcLink(this, "link", {
      targets: [loadBalancedFargateService.loadBalancer],
    });

    const getIntegration = new apigateway.Integration({
      type: apigateway.IntegrationType.HTTP_PROXY,
      integrationHttpMethod: "GET",
      options: {
        connectionType: apigateway.ConnectionType.VPC_LINK,
        vpcLink: link,
      },
    });
    const postIntegration = new apigateway.Integration({
      type: apigateway.IntegrationType.HTTP_PROXY,
      integrationHttpMethod: "POST",
      options: {
        connectionType: apigateway.ConnectionType.VPC_LINK,
        vpcLink: link,
      },
    });

    // API Gateway
    const api = new apigateway.RestApi(this, "Api");
    api.root.addMethod("GET", getIntegration);
    api.root.addMethod("POST", postIntegration);
  }
}
