# Scalable Web Application on AWS - Multi-AZ Architecture with ALB, Auto Scaling & RDS Failover

A production-grade reference architecture for deploying a highly available web application on AWS, built around a real transactional ledger system (Hawala-style financial ledger, Next.js + PostgreSQL).

---

## Architecture Diagram

<img width="2680" height="3116" alt="whole diagram2" src="https://github.com/user-attachments/assets/b5a39570-095e-4808-8e39-6eba7611aa82" />

---

## Architecture Overview

This architecture delivers a highly available, auto-scaling web application spread across two Availability Zones, fronted by a global CDN and edge security layer.

A client request first resolves through **Route 53**, which also runs a health check against the origin so it can fail over if the application becomes unreachable. The request then hits **CloudFront**, which caches static assets at edge locations to reduce latency and offload traffic from the origin. Before CloudFront forwards any request to the origin, it passes through a **WAF Web ACL** (AWS Managed Core Rule Set) attached directly to the CloudFront distribution, filtering malicious traffic at the edge, before it ever reaches the VPC.

Traffic that clears WAF enters the VPC through the **Internet Gateway** and lands on an **Application Load Balancer**, which is provisioned across both Availability Zones. The ALB distributes requests to healthy targets in an **Auto Scaling Group** of EC2 instances running the application, scaling out on a target-tracking CPU policy. These instances sit in private subnets and reach the internet (for OS updates, outbound API calls) only through a **NAT Gateway** provisioned in the same AZ, there is no direct inbound path to them.

The application connects to a **Multi-AZ RDS PostgreSQL** instance. The primary database lives in AZ-a; a synchronously replicated standby lives in AZ-b, and RDS handles automatic failover if the primary becomes unavailable.

Running alongside the request path is an observability and management plane: **CloudWatch** collects metrics from the ASG, ALB, and RDS; **CloudWatch Alarms** trigger **SNS** notifications to the operator when thresholds are breached (e.g. high CPU, unhealthy targets). Administrative access to EC2 instances is handled entirely through **AWS Systems Manager Session Manager**, there is no bastion host and no exposed SSH port anywhere in this architecture.

---

## Services Used

| Service | Purpose | Key Configuration |
|---|---|---|
| VPC | Network isolation | 2 Availability Zones, public + private subnets, `10.0.0.0/16` |
| Internet Gateway | Public internet access | Attached at the VPC level, shared by both AZs |
| NAT Gateway | Outbound-only access for private subnets | One per AZ, referenced only by that AZ's private route table |
| Route Tables | Public/private subnet routing | Public: `0.0.0.0/0 → IGW`. Private: `0.0.0.0/0 → NAT Gateway` (same AZ) |
| ALB | Layer 7 routing | Spans both AZs, routes to healthy ASG targets |
| ASG + EC2 | Compute + auto scaling | Launch Template, target-tracking scaling policy on CPU |
| RDS (PostgreSQL) | Database | Multi-AZ, synchronous replication, automated failover |
| CloudFront | CDN | Caches static assets; **WAF Web ACL attached here** |
| WAF | Edge security | AWS Managed Core Rule Set, attached to the CloudFront distribution |
| Route 53 | DNS + failover | Alias record → CloudFront; health check against the ALB origin |
| CloudWatch | Monitoring | Metrics from ASG, ALB, RDS; alarms on CPU / unhealthy targets |
| SNS | Alerting | Notifies operator (email) when a CloudWatch Alarm fires |
| Systems Manager | Secure instance access | Session Manager — no bastion host, no exposed SSH |

---

## Design Decisions & Trade-offs

**WAF on CloudFront, not the ALB.**
Attaching the Web ACL to CloudFront filters malicious traffic (SQLi, XSS, bad bots) at the edge, before it ever reaches the VPC or consumes ALB/EC2 capacity. The trade-off is that this only protects traffic that goes through CloudFront, any path that reaches the ALB directly (bypassing the CDN) would be unprotected, so the ALB's Security Group is also locked down to accept traffic only from CloudFront's IP range.

**Multi-AZ RDS instead of single-AZ.**
Single-AZ RDS is cheaper but has no automatic failover, a database-layer outage becomes a full application outage. Multi-AZ roughly doubles database cost but gives automated failover to a synchronously replicated standby, which is the point of this exercise (high availability, not minimum cost).

**One NAT Gateway per AZ instead of one shared NAT Gateway.**
A single shared NAT Gateway is cheaper but creates a cross-AZ dependency and a single point of failure for all outbound traffic from private subnets. Provisioning one NAT Gateway per AZ preserves AZ isolation, if AZ-a fails, AZ-b's outbound path is unaffected, at roughly double the NAT Gateway cost.

**Systems Manager Session Manager instead of a bastion host.**
A traditional bastion host requires an exposed SSH port, a public IP, and its own patching lifecycle, it's an extra attack surface to secure. Session Manager gives the same shell access to private EC2 instances with no open inbound ports at all and centralized IAM-based access control and logging.

**Database migration note (Neon → RDS).**
The underlying application (a Hawala-style transactional ledger) was originally built against Neon serverless PostgreSQL, which is well suited to serverless workflows and branch-per-feature development. This architecture instead targets **RDS Multi-AZ** specifically to demonstrate the classic primary/standby failover pattern this project is scoped around. A real production migration would additionally need to account for Neon-specific features (e.g. instant branching) that don't have a direct RDS equivalent.

**WebSocket transfer-order feature, out of scope.**
The application includes a real-time transfer-order feature (Socket.IO) that requires persistent, stateful connections. This doesn't fit cleanly behind a standard ALB + stateless Auto Scaling Group, which assumes interchangeable, short-lived request handling. It is intentionally excluded from this architecture; the current implementation runs the WebSocket relay standalone on a separate VPS, decoupled from the AWS deployment described here.

---

## Security Considerations

- Compute and data tiers (EC2, RDS) live exclusively in private subnets with no direct route to the internet.
- Security Groups are chained with least privilege: ALB SG → EC2 SG → RDS SG, each accepting traffic only from the preceding layer.
- WAF's AWS Managed Core Rule Set provides baseline protection against the OWASP Top 10 at the edge.
- No SSH port is open anywhere in the architecture; all instance access goes through Systems Manager Session Manager, which is fully IAM-governed and logged.
- The ALB's Security Group restricts inbound traffic to CloudFront's published IP range, preventing direct-to-origin bypass of the WAF layer.

---

## Scalability & High Availability

- The Auto Scaling Group spans both Availability Zones and scales EC2 capacity based on a CPU target-tracking policy.
- The ALB distributes traffic only to targets that pass health checks, automatically removing unhealthy instances from rotation.
- RDS Multi-AZ provides automated failover to a synchronous standby with no manual intervention required.
- CloudFront absorbs static asset traffic at the edge, reducing load on the origin during traffic spikes.
- Route 53 health checks against the origin allow for DNS-level failover if the application becomes unreachable.

---

## Repository Structure

```
/diagram        → architecture diagram source file + exported image (diagram.png)
README.md       → this file
```

---
